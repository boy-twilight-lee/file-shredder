import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, Tray } from 'electron';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onWindowDrag } from 'electron-drag-window/electron';
import { shredPaths } from './shredder';
import { AppStore, type AppSettings, type ShredLog, type UploadedPetImage } from './store';
import { installContextMenu, isContextMenuInstalled, removeContextMenu, updateContextMenuIcon } from './windows-integration';
import { getExplorerSelection } from './windows-selection';

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));
const store = new AppStore(app);
let petWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentSettings: AppSettings;
let isQuitting = false;
let isShredding = false;
let launchTimer: NodeJS.Timeout | undefined;
let petFadeTimer: NodeJS.Timeout | undefined;
let queuedLaunchPaths: string[] = [];
type PetBubblePlacement = 'left' | 'right';
interface PetImageTemplate {
  id: string;
  name: string;
  image: string;
  builtIn: boolean;
  active: boolean;
  deletable: boolean;
}

const BUILT_IN_PET_IMAGES = [
  { id: 'built-in-portrait-1', name: '半身近照', fileName: 'portrait-template-1.png' },
  { id: 'built-in-portrait-2', name: '双手提带', fileName: 'portrait-template-2.png' },
  { id: 'built-in-portrait-3', name: '湖畔抬手', fileName: 'portrait-template-3.png' },
] as const;
// 固定画布覆盖最大人物和四向气泡，透明区域通过动态鼠标穿透避免遮挡桌面。
const PET_WINDOW_SIZE = { width: 960, height: 1160 };
const PET_BUBBLE_SIZE = { width: 288, height: 340 };
const PET_SIZE_MIN = 100;
const PET_SIZE_MAX = 320;
const PET_FADE_DURATION_MS = 180;
let petBubblePlacement: PetBubblePlacement = 'left';
let isPetExpanded = false;
let isPetWindowMouseThrough = false;
let isPetDragging = false;
let petBubbleBounds: Electron.Rectangle | null = null;
let petDragStartPosition: Electron.Point | null = null;
let petCharacterSizeCache: { imagePath: string; width: number; size: Electron.Size } | null = null;

// vite-plugin-electron 会在 preload 重新构建后通知主进程，刷新窗口即可载入新桥接代码。
if (process.env.VITE_DEV_SERVER_URL) {
  process.on('message', (message) => {
    if (message !== 'electron-vite&type=hot-reload') return;
    BrowserWindow.getAllWindows().forEach((window) => window.webContents.reload());
  });
}

function getExecutablePath(): string {
  // portable 构建运行在临时目录，注册表和自启必须指向外层 EXE。
  return process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
}

function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.png')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.png');
}

function getWindowsIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.ico')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.ico');
}

function getPetImagesDirectory(): string {
  return join(app.getPath('userData'), 'pet-templates');
}

function getBuiltInPetImagePath(fileName: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'pet-templates', fileName)
    : join(app.getAppPath(), 'src', 'assets', 'pet-templates', fileName);
}

function getUploadedPetImagePath(image: UploadedPetImage): string {
  return join(getPetImagesDirectory(), image.fileName);
}

function getActivePetImagePath(): string {
  const builtIn = BUILT_IN_PET_IMAGES.find((image) => image.id === currentSettings.petImageTemplateId);
  if (builtIn) return getBuiltInPetImagePath(builtIn.fileName);
  const uploaded = currentSettings.uploadedPetImages.find((image) => image.id === currentSettings.petImageTemplateId);
  if (uploaded) return getUploadedPetImagePath(uploaded);
  if (currentSettings.customPetImagePath && existsSync(currentSettings.customPetImagePath)) return currentSettings.customPetImagePath;
  return getBuiltInPetImagePath(BUILT_IN_PET_IMAGES[0].fileName);
}

function imagePathToDataUrl(imagePath: string): string {
  if (!imagePath || !existsSync(imagePath)) return '';
  const image = nativeImage.createFromPath(imagePath);
  return image.isEmpty() ? '' : image.toDataURL();
}

function getPetImageDataUrl(): string {
  return imagePathToDataUrl(getActivePetImagePath());
}

function getPetImageTemplates(): PetImageTemplate[] {
  const activeId = currentSettings.petImageTemplateId;
  const builtInTemplates = BUILT_IN_PET_IMAGES.map((image) => ({
    id: image.id,
    name: image.name,
    image: imagePathToDataUrl(getBuiltInPetImagePath(image.fileName)),
    builtIn: true,
    active: image.id === activeId,
    deletable: false,
  }));
  const uploadedTemplates = currentSettings.uploadedPetImages
    .filter((image) => existsSync(getUploadedPetImagePath(image)))
    .map((image) => ({
      id: image.id,
      name: image.name,
      image: imagePathToDataUrl(getUploadedPetImagePath(image)),
      builtIn: false,
      active: image.id === activeId,
      deletable: true,
    }));
  // 配置中的模板丢失时，界面和桌宠都回退到第一个内置形象。
  if (![...builtInTemplates, ...uploadedTemplates].some((image) => image.active)) builtInTemplates[0].active = true;
  return [...builtInTemplates, ...uploadedTemplates];
}

async function migrateLegacyPetImage(): Promise<void> {
  if (!currentSettings.customPetImagePath || !existsSync(currentSettings.customPetImagePath) || currentSettings.uploadedPetImages.length > 0) return;
  const id = randomUUID();
  const fileName = `${id}.png`;
  await mkdir(getPetImagesDirectory(), { recursive: true });
  await copyFile(currentSettings.customPetImagePath, join(getPetImagesDirectory(), fileName));
  currentSettings = await store.updateSettings({
    customPetImagePath: '',
    petImageTemplateId: id,
    uploadedPetImages: [{ id, name: '我的桌宠', fileName }],
  });
}

function notifyPetAppearanceChanged(): void {
  petWindow?.webContents.send('settings:changed');
  settingsWindow?.webContents.send('settings:changed');
}

function parseLaunchPaths(argv: string[]): string[] {
  const marker = argv.indexOf('--shred');
  if (marker < 0) return [];
  return argv.slice(marker + 1).map((item) => resolve(item)).filter(existsSync);
}

function parseClipboardPaths(): string[] {
  const candidates = [clipboard.readText(), clipboard.read('text/uri-list')];
  const fileName = clipboard.readBuffer('FileNameW');
  if (fileName.length > 0) candidates.push(fileName.toString('utf16le').replace(/\0+$/g, ''));
  return [...new Set(candidates.flatMap((text) => text.split(/\r?\n/))
    .map((item) => decodeURIComponent(item.trim().replace(/^file:\/\//i, '').replace(/^\/(?=[A-Za-z]:)/, '')))
    .filter((item) => item.length > 0 && existsSync(item))
    .map((item) => resolve(item)))];
}

async function loadView(window: BrowserWindow, view: 'pet' | 'settings'): Promise<void> {
  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(`${process.env.VITE_DEV_SERVER_URL}?view=${view}`);
    return;
  }
  await window.loadFile(join(currentDirectory, '../dist-renderer/index.html'), { query: { view } });
}

function animatePetOpacity(targetOpacity: number, onComplete?: () => void): void {
  const window = petWindow;
  if (!window || window.isDestroyed()) return;
  clearInterval(petFadeTimer);
  const startOpacity = window.getOpacity();
  const startedAt = Date.now();
  petFadeTimer = setInterval(() => {
    if (window.isDestroyed() || petWindow !== window) {
      clearInterval(petFadeTimer);
      petFadeTimer = undefined;
      return;
    }
    const progress = Math.min(1, (Date.now() - startedAt) / PET_FADE_DURATION_MS);
    const easedProgress = 1 - (1 - progress) ** 3;
    window.setOpacity(startOpacity + (targetOpacity - startOpacity) * easedProgress);
    if (progress < 1) return;
    clearInterval(petFadeTimer);
    petFadeTimer = undefined;
    onComplete?.();
  }, 16);
}

function showPet(): void {
  if (!petWindow) return;
  if (!petWindow.isVisible()) {
    petWindow.setOpacity(0);
    petWindow.showInactive();
    refreshTray();
  }
  animatePetOpacity(1);
}

function hidePet(): void {
  if (!petWindow?.isVisible()) return;
  const window = petWindow;
  animatePetOpacity(0, () => {
    if (window.isDestroyed()) return;
    window.hide();
    window.setOpacity(1);
    refreshTray();
  });
}

function getPetCharacterSize(): Electron.Size {
  const width = Math.min(PET_SIZE_MAX, Math.max(PET_SIZE_MIN, Math.round(currentSettings.petSize)));
  const imagePath = getActivePetImagePath();
  if (petCharacterSizeCache?.imagePath === imagePath && petCharacterSizeCache.width === width) {
    return petCharacterSizeCache.size;
  }
  // 图片或桌宠尺寸未变化时复用计算结果，避免命中检测反复读取和解码 PNG。
  const activeImage = nativeImage.createFromPath(imagePath);
  const imageSize = !activeImage.isEmpty() ? activeImage.getSize() : { width: 594, height: 840 };
  const size = { width, height: Math.round(width * imageSize.height / imageSize.width) };
  petCharacterSizeCache = { imagePath, width, size };
  return size;
}

function getPetWindowSize(): Electron.Size {
  if (!petWindow) return PET_WINDOW_SIZE;
  const bounds = petWindow.getContentBounds();
  return { width: bounds.width, height: bounds.height };
}

function getLocalPetCharacterBounds(): Electron.Rectangle {
  const windowSize = getPetWindowSize();
  const size = getPetCharacterSize();
  return {
    x: Math.round((windowSize.width - size.width) / 2),
    y: Math.round((windowSize.height - size.height) / 2),
    ...size,
  };
}

function getPetCharacterBounds(): Electron.Rectangle | null {
  if (!petWindow) return null;
  const windowBounds = petWindow.getBounds();
  const character = getLocalPetCharacterBounds();
  return { ...character, x: windowBounds.x + character.x, y: windowBounds.y + character.y };
}

function getRestoredPetWindowPosition(characterSize: Electron.Size, windowSize: Electron.Size): Electron.Point {
  const displays = screen.getAllDisplays();
  const savedDisplay = displays.find((display) => display.id === currentSettings.petDisplayId);
  const display = savedDisplay ?? screen.getPrimaryDisplay();
  const { workArea } = display;
  const hasSavedPosition = Number.isFinite(currentSettings.petPositionX) && Number.isFinite(currentSettings.petPositionY);
  let characterX = workArea.x + workArea.width - 225;
  let characterY = workArea.y + workArea.height - 290;
  if (hasSavedPosition) {
    const relativeX = Math.min(1, Math.max(0, currentSettings.petPositionX as number));
    const relativeY = Math.min(1, Math.max(0, currentSettings.petPositionY as number));
    characterX = Math.round(workArea.x + relativeX * workArea.width - characterSize.width / 2);
    characterY = Math.round(workArea.y + relativeY * workArea.height - characterSize.height / 2);
  }
  // 只限制可见人物，允许用于气泡布局的透明画布自然延伸到工作区外。
  characterX = Math.min(workArea.x + Math.max(0, workArea.width - characterSize.width), Math.max(workArea.x, characterX));
  characterY = Math.min(workArea.y + Math.max(0, workArea.height - characterSize.height), Math.max(workArea.y, characterY));
  return {
    x: characterX - Math.round((windowSize.width - characterSize.width) / 2),
    y: characterY - Math.round((windowSize.height - characterSize.height) / 2),
  };
}

async function savePetPosition(): Promise<void> {
  if (!petWindow || petWindow.isDestroyed() || isPetDragging) return;
  const bounds = getPetCharacterBounds();
  if (!bounds) return;
  const display = screen.getDisplayMatching(bounds);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const relativeX = Math.min(1, Math.max(0, (centerX - display.workArea.x) / display.workArea.width));
  const relativeY = Math.min(1, Math.max(0, (centerY - display.workArea.y) / display.workArea.height));
  currentSettings = await store.updateSettings({
    petDisplayId: display.id,
    petPositionX: relativeX,
    petPositionY: relativeY,
  });
}

function restorePetPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const [width, height] = petWindow.getSize();
  const position = getRestoredPetWindowPosition(getPetCharacterSize(), { width, height });
  petWindow.setPosition(position.x, position.y);
}

function getLocalPetBubbleBounds(): Electron.Rectangle {
  const windowSize = getPetWindowSize();
  const character = getLocalPetCharacterBounds();
  const centerX = windowSize.width / 2;
  const centerY = windowSize.height / 2;
  const gap = 14;
  const bubbles: Record<PetBubblePlacement, Electron.Rectangle> = {
    left: { x: Math.round(centerX - character.width / 2 - gap - PET_BUBBLE_SIZE.width), y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2), ...PET_BUBBLE_SIZE },
    right: { x: Math.round(centerX + character.width / 2 + gap), y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2), ...PET_BUBBLE_SIZE },
  };
  return bubbles[petBubblePlacement];
}

function containsPoint(bounds: Electron.Rectangle, point: Electron.Point): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function expandBounds(bounds: Electron.Rectangle, padding: number): Electron.Rectangle {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function updatePetWindowMouseThrough(pointer?: Electron.Point): void {
  if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible() || isPetDragging) return;
  let localCursor = pointer;
  if (!localCursor) {
    const windowBounds = petWindow.getBounds();
    const cursor = screen.getCursorScreenPoint();
    localCursor = { x: cursor.x - windowBounds.x, y: cursor.y - windowBounds.y };
  }
  const bubbleBounds = petBubbleBounds ?? getLocalPetBubbleBounds();
  const isInteractive = containsPoint(expandBounds(getLocalPetCharacterBounds(), 10), localCursor)
    || (isPetExpanded && containsPoint(expandBounds(bubbleBounds, 6), localCursor));
  if (isPetWindowMouseThrough === !isInteractive) return;
  isPetWindowMouseThrough = !isInteractive;
  // 透明画布区域点击穿透；forward 保留鼠标移动，以便光标重新进入人物或气泡时恢复交互。
  petWindow.setIgnoreMouseEvents(isPetWindowMouseThrough, { forward: true });
}

function setPetExpanded(expanded: boolean): void {
  if (!petWindow) return;
  isPetExpanded = expanded;
  if (!expanded) {
    updatePetWindowMouseThrough();
    return;
  }
  const bounds = getPetCharacterBounds();
  if (!bounds) return;
  const workArea = screen.getDisplayMatching(bounds).workArea;
  const availableLeft = bounds.x - workArea.x;
  const availableRight = workArea.x + workArea.width - bounds.x - bounds.width;
  // 气泡始终贴在人物侧面，空间不足时选择剩余区域更大的一侧。
  petBubblePlacement = availableLeft >= PET_BUBBLE_SIZE.width + 14 || availableLeft >= availableRight
    ? 'left'
    : 'right';
  updatePetWindowMouseThrough();
  petWindow.webContents.send('pet:placement', petBubblePlacement);
}

function createPetWindow(): void {
  const characterSize = getPetCharacterSize();
  const initialPosition = getRestoredPetWindowPosition(characterSize, PET_WINDOW_SIZE);
  petWindow = new BrowserWindow({
    ...PET_WINDOW_SIZE,
    ...initialPosition,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: currentSettings.alwaysOnTop,
    skipTaskbar: true,
    hasShadow: false,
    show: !process.argv.includes('--background'),
    webPreferences: { preload: join(currentDirectory, 'preload.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // Windows 可能按工作区限制超大透明窗口，创建后使用真实尺寸重新保持人物锚点。
  const actualWindowSize = petWindow.getSize();
  const actualPosition = getRestoredPetWindowPosition(characterSize, { width: actualWindowSize[0], height: actualWindowSize[1] });
  petWindow.setPosition(actualPosition.x, actualPosition.y);
  // Windows 合成器偶尔会在首帧回退为不透明底色，加载后再次明确透明色。
  petWindow.webContents.once('did-finish-load', () => petWindow?.setBackgroundColor('#00000000'));
  loadView(petWindow, 'pet');
  petWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      petWindow?.hide();
    }
  });
  petWindow.on('closed', () => {
    clearInterval(petFadeTimer);
    petFadeTimer = undefined;
    petDragStartPosition = null;
    petWindow = null;
  });
}

function createPanelWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 640,
    height: 680,
    minWidth: 560,
    minHeight: 560,
    title: '文件粉碎器 · 设置',
    icon: getIconPath(),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fa',
    webPreferences: { preload: join(currentDirectory, 'preload.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  loadView(window, 'settings');
  window.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });
  return window;
}

function showSettingsWindow(): void {
  if (!settingsWindow) {
    settingsWindow = createPanelWindow();
    settingsWindow.on('closed', () => { settingsWindow = null; });
  }
  settingsWindow.show();
  settingsWindow.focus();
}

function applyLoginSetting(enabled: boolean): void {
  if (process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: enabled, path: getExecutablePath(), args: ['--background'] });
}

function registerShortcut(shortcut: string): boolean {
  globalShortcut.unregisterAll();
  return globalShortcut.register(shortcut, handleShortcut);
}

function classifyResult(path: string, success: boolean, error?: string): Omit<ShredLog, 'id' | 'timestamp'> {
  if (success) return { path, success, category: 'success', message: '粉碎成功' };
  const message = error ?? '未知错误';
  if (/保护目录/.test(message)) return { path, success, category: 'protected', message };
  if (/EPERM|EACCES|permission/i.test(message)) return { path, success, category: 'permission', message: `权限不足：${message}` };
  if (/EBUSY|occupied|used by another/i.test(message)) return { path, success, category: 'occupied', message: `文件被占用：${message}` };
  return { path, success, category: 'unknown', message };
}

function normalizeTargets(paths: string[]): string[] {
  return [...new Set(paths.filter(existsSync).map((item) => resolve(item)))];
}

function requestPetConfirmation(paths: string[]): void {
  const targets = normalizeTargets(paths);
  if (targets.length === 0) return;
  showPet();
  setPetExpanded(true);
  petWindow?.webContents.send('pet:confirm', targets, currentSettings.passes);
}

async function requestShred(paths: string[], passes: 3 | 7 | 35 = currentSettings.passes) {
  const targets = [...new Set(paths.filter(existsSync).map((item) => resolve(item)))];
  if (targets.length === 0 || isShredding) return [];

  isShredding = true;
  petWindow?.webContents.send('pet:state', 'working');
  try {
    const results = await shredPaths(targets, passes, (progress) => {
      tray?.setToolTip(`正在粉碎 ${progress.fileIndex}/${progress.fileCount}`);
      petWindow?.webContents.send('pet:progress', progress);
    });
    await store.appendLogs(results.map((result) => classifyResult(result.path, result.success, result.error)));
    const failed = results.filter((result) => !result.success);
    petWindow?.webContents.send('pet:state', failed.length === 0 ? 'success' : 'failure');
    petWindow?.webContents.send('pet:complete', { total: results.length, failed: failed.length });
    if (Notification.isSupported()) {
      new Notification({
        title: failed.length === 0 ? '文件粉碎完成' : '部分目标粉碎失败',
        body: failed.length === 0 ? `已永久粉碎 ${results.length} 个目标` : `${failed.length} 个目标失败，请在设置的日志中查看原因`,
        icon: getIconPath(),
      }).show();
    }
    return results;
  } finally {
    isShredding = false;
    tray?.setToolTip('文件粉碎器');
    setTimeout(() => petWindow?.webContents.send('pet:state', 'idle'), 1800);
    settingsWindow?.webContents.send('logs:updated');
  }
}

async function handleShortcut(): Promise<void> {
  const selectedPaths = await getExplorerSelection();
  const paths = selectedPaths.length > 0 ? selectedPaths : parseClipboardPaths();
  if (paths.length > 0) {
    requestPetConfirmation(paths);
    return;
  }
  if (Notification.isSupported()) {
    new Notification({ title: '未读取到选中项', body: '请在资源管理器中选择文件后重试', icon: getIconPath() }).show();
  }
}

function queueLaunchPaths(paths: string[]): void {
  queuedLaunchPaths = [...new Set([...queuedLaunchPaths, ...paths])];
  clearTimeout(launchTimer);
  launchTimer = setTimeout(async () => {
    const targets = queuedLaunchPaths;
    queuedLaunchPaths = [];
    requestPetConfirmation(targets);
  }, 260);
}

async function setContextMenuEnabled(enabled: boolean): Promise<void> {
  const succeeded = enabled
    ? await installContextMenu(getExecutablePath(), getWindowsIconPath())
    : await removeContextMenu();
  if (!succeeded) throw new Error(enabled ? '资源管理器右键菜单安装失败' : '资源管理器右键菜单卸载失败');
  currentSettings = await store.updateSettings({ contextMenuInstalled: enabled, contextMenuAutoInstall: false });
  settingsWindow?.webContents.send('settings:changed');
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: petWindow?.isVisible() ? '隐藏桌宠' : '显示桌宠', click: () => {
      if (petWindow?.isVisible()) hidePet();
      else showPet();
    } },
    { label: '设置', click: showSettingsWindow },
    { type: 'separator' },
    { label: '关闭', click: () => {
      // 托盘关闭表示退出程序，保留用户设置和已安装的系统集成。
      isQuitting = true;
      app.quit();
    } },
  ]);
}

function refreshTray(): void {
  tray?.setContextMenu(buildTrayMenu());
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(getIconPath()).resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);
  tray.setToolTip('文件粉碎器');
  tray.on('double-click', showPet);
  refreshTray();
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on('second-instance', (_event, argv) => queueLaunchPaths(parseLaunchPaths(argv)));
  app.whenReady().then(async () => {
    currentSettings = await store.getSettings();
    await migrateLegacyPetImage();
    createPetWindow();
    onWindowDrag();
    screen.on('display-removed', restorePetPosition);
    screen.on('display-metrics-changed', restorePetPosition);
    createTray();
    if (!registerShortcut(currentSettings.shortcut)) {
      currentSettings = await store.updateSettings({ shortcut: 'CommandOrControl+Alt+X' });
      registerShortcut(currentSettings.shortcut);
    }

    // 资源管理器右键菜单仅由设置项控制，启动时只同步真实状态。
    await updateContextMenuIcon(getWindowsIconPath());
    const contextMenuInstalled = await isContextMenuInstalled(getExecutablePath());
    // 已安装的菜单在启动时重写一次图标值，确保升级图标后立即同步到资源管理器。
    if (contextMenuInstalled) await installContextMenu(getExecutablePath(), getWindowsIconPath());
    currentSettings = await store.updateSettings({ contextMenuInstalled, contextMenuAutoInstall: false });
    queueLaunchPaths(parseLaunchPaths(process.argv));
  });
}

ipcMain.handle('targets:choose', async (_event, kind: 'file' | 'directory') => {
  const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = kind === 'file'
    ? ['openFile', 'multiSelections']
    : ['openDirectory', 'multiSelections'];
  const result = await dialog.showOpenDialog({ properties });
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('shred:prepare', (_event, paths: unknown) => {
  if (!Array.isArray(paths) || !paths.every((item) => typeof item === 'string')) throw new Error('无效的路径参数');
  return normalizeTargets(paths);
});
ipcMain.handle('shred:start', async (_event, paths: unknown, passes: unknown) => {
  if (!Array.isArray(paths) || !paths.every((item) => typeof item === 'string')) throw new Error('无效的路径参数');
  if (passes !== 3 && passes !== 7 && passes !== 35) throw new Error('无效的清除强度');
  return requestShred(paths, passes);
});
ipcMain.on('pet:expanded', (_event, expanded: boolean) => setPetExpanded(Boolean(expanded)));
ipcMain.on('pet:bubble-bounds', (_event, bounds: unknown) => {
  if (bounds === null) {
    petBubbleBounds = null;
    updatePetWindowMouseThrough();
    return;
  }
  if (!bounds || typeof bounds !== 'object') return;
  const candidate = bounds as Partial<Electron.Rectangle>;
  if (![candidate.x, candidate.y, candidate.width, candidate.height].every(Number.isFinite)) return;
  petBubbleBounds = {
    x: Math.round(candidate.x as number),
    y: Math.round(candidate.y as number),
    width: Math.round(candidate.width as number),
    height: Math.round(candidate.height as number),
  };
  updatePetWindowMouseThrough();
});
ipcMain.on('pet:pointer-move', (event, pointer: unknown) => {
  if (!petWindow || event.sender !== petWindow.webContents || !pointer || typeof pointer !== 'object') return;
  const candidate = pointer as Partial<Electron.Point>;
  if (![candidate.x, candidate.y].every(Number.isFinite)) return;
  updatePetWindowMouseThrough({ x: candidate.x as number, y: candidate.y as number });
});
ipcMain.on('ELECTRON_DRAG_START', (event) => {
  if (!petWindow || event.sender !== petWindow.webContents) return;
  isPetDragging = true;
  const [x, y] = petWindow.getPosition();
  petDragStartPosition = { x, y };
  isPetWindowMouseThrough = false;
  petWindow.setIgnoreMouseEvents(false);
});
ipcMain.on('ELECTRON_DRAG_OVER', async (event) => {
  if (!petWindow || event.sender !== petWindow.webContents) return;
  isPetDragging = false;
  updatePetWindowMouseThrough();
  const [x, y] = petWindow.getPosition();
  const hasMoved = Boolean(petDragStartPosition
    && (petDragStartPosition.x !== x || petDragStartPosition.y !== y));
  petDragStartPosition = null;
  if (!hasMoved) return;
  // 只在一次真实拖拽结束后持久化，程序恢复位置和普通窗口事件不再写磁盘。
  try {
    await savePetPosition();
  } catch (error) {
    console.error('保存桌宠位置失败', error);
  }
});
ipcMain.handle('context-menu:install', async () => { await setContextMenuEnabled(true); return true; });
ipcMain.handle('context-menu:remove', async () => { await setContextMenuEnabled(false); return true; });
ipcMain.handle('context-menu:status', () => isContextMenuInstalled(getExecutablePath()));
ipcMain.handle('settings:get', () => currentSettings);
ipcMain.handle('settings:update', async (_event, patch: Partial<AppSettings>) => {
  const safePatch = { ...patch };
  delete safePatch.customPetImagePath;
  delete safePatch.petImageTemplateId;
  delete safePatch.uploadedPetImages;
  if (typeof safePatch.petSize === 'number') {
    safePatch.petSize = Math.min(PET_SIZE_MAX, Math.max(PET_SIZE_MIN, Math.round(safePatch.petSize)));
  }
  if (safePatch.shortcut && safePatch.shortcut !== currentSettings.shortcut && !registerShortcut(safePatch.shortcut)) {
    registerShortcut(currentSettings.shortcut);
    throw new Error('快捷键无效或已被其他程序占用');
  }
  if (typeof safePatch.contextMenuInstalled === 'boolean' && safePatch.contextMenuInstalled !== currentSettings.contextMenuInstalled) {
    await setContextMenuEnabled(safePatch.contextMenuInstalled);
  }
  currentSettings = await store.updateSettings({ ...safePatch, contextMenuAutoInstall: false });
  petWindow?.setAlwaysOnTop(currentSettings.alwaysOnTop);
  if (typeof safePatch.launchAtLogin === 'boolean') applyLoginSetting(safePatch.launchAtLogin);
  notifyPetAppearanceChanged();
  refreshTray();
  return currentSettings;
});
ipcMain.handle('pet-image:get', () => getPetImageDataUrl());
ipcMain.handle('pet-image:list', () => getPetImageTemplates());
ipcMain.handle('pet-image:choose', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择桌宠 PNG 图片',
    properties: ['openFile'],
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const sourcePath = result.filePaths[0];
  if (nativeImage.createFromPath(sourcePath).isEmpty()) throw new Error('无法读取这张 PNG 图片');
  const id = randomUUID();
  const fileName = `${id}.png`;
  await mkdir(getPetImagesDirectory(), { recursive: true });
  const targetPath = join(getPetImagesDirectory(), fileName);
  await copyFile(sourcePath, targetPath);
  const uploadedPetImages = [...currentSettings.uploadedPetImages, {
    id,
    name: result.filePaths[0].split(/[\\/]/).pop()?.replace(/\.png$/i, '') || '我的桌宠',
    fileName,
  }];
  currentSettings = await store.updateSettings({
    customPetImagePath: '',
    petImageTemplateId: id,
    uploadedPetImages,
  });
  notifyPetAppearanceChanged();
  return getPetImageTemplates();
});
ipcMain.handle('pet-image:select', async (_event, id: unknown) => {
  if (typeof id !== 'string') throw new Error('无效的桌宠模板');
  const exists = BUILT_IN_PET_IMAGES.some((image) => image.id === id)
    || currentSettings.uploadedPetImages.some((image) => image.id === id && existsSync(getUploadedPetImagePath(image)));
  if (!exists) throw new Error('桌宠模板不存在');
  currentSettings = await store.updateSettings({ petImageTemplateId: id });
  notifyPetAppearanceChanged();
  return getPetImageTemplates();
});
ipcMain.handle('pet-image:delete', async (_event, id: unknown) => {
  if (typeof id !== 'string') throw new Error('无效的桌宠模板');
  const target = currentSettings.uploadedPetImages.find((image) => image.id === id);
  if (!target) throw new Error('内置模板不能删除');
  await rm(getUploadedPetImagePath(target), { force: true });
  const uploadedPetImages = currentSettings.uploadedPetImages.filter((image) => image.id !== id);
  currentSettings = await store.updateSettings({
    petImageTemplateId: currentSettings.petImageTemplateId === id ? BUILT_IN_PET_IMAGES[0].id : currentSettings.petImageTemplateId,
    uploadedPetImages,
  });
  notifyPetAppearanceChanged();
  return getPetImageTemplates();
});
ipcMain.handle('logs:get', () => store.getLogs());
ipcMain.handle('logs:clear', async () => { await store.clearLogs(); return true; });
ipcMain.handle('logs:delete', (_event, ids: unknown) => {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) throw new Error('无效的粉碎记录参数');
  return store.deleteLogs([...new Set(ids)]);
});
ipcMain.handle('app:cleanup-exit', async () => {
  await removeContextMenu();
  applyLoginSetting(false);
  await store.cleanup();
  isQuitting = true;
  setImmediate(() => app.quit());
  return true;
});
ipcMain.on('window:hide', (event) => BrowserWindow.fromWebContents(event.sender)?.hide());
app.on('window-all-closed', () => undefined);
app.on('will-quit', () => {
  clearTimeout(launchTimer);
  clearInterval(petFadeTimer);
  globalShortcut.unregisterAll();
});
