import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, nativeImage, Notification, screen, Tray } from 'electron';
import { existsSync } from 'node:fs';
import { copyFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onWindowDrag } from 'electron-drag-window/electron';
import { shredPaths } from './shredder';
import { AppStore, type AppSettings, type ShredLog } from './store';
import { installContextMenu, isContextMenuInstalled, removeContextMenu } from './windows-integration';
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
let petHitTestTimer: NodeJS.Timeout | undefined;
let queuedLaunchPaths: string[] = [];
type PetBubblePlacement = 'above' | 'left' | 'right' | 'below';
// 固定画布覆盖最大人物和四向气泡，透明区域通过动态鼠标穿透避免遮挡桌面。
const PET_WINDOW_SIZE = { width: 960, height: 1160 };
const PET_BUBBLE_SIZE = { width: 304, height: 340 };
const PET_SIZE_MIN = 120;
const PET_SIZE_MAX = 320;
let petBubblePlacement: PetBubblePlacement = 'above';
let isPetExpanded = false;
let isPetWindowMouseThrough = false;
let isPetDragging = false;

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

function getCustomPetImagePath(): string {
  return join(app.getPath('userData'), 'custom-pet.png');
}

function getCustomPetImageDataUrl(): string {
  const imagePath = currentSettings.customPetImagePath;
  if (!imagePath || !existsSync(imagePath)) return '';
  const image = nativeImage.createFromPath(imagePath);
  return image.isEmpty() ? '' : image.toDataURL();
}

function notifyPetAppearanceChanged(): void {
  petWindow?.webContents.send('settings:changed');
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

function showPet(): void {
  petWindow?.showInactive();
}

function getPetCharacterSize(): Electron.Size {
  const width = Math.min(PET_SIZE_MAX, Math.max(PET_SIZE_MIN, Math.round(currentSettings.petSize)));
  const customImage = currentSettings.customPetImagePath
    ? nativeImage.createFromPath(currentSettings.customPetImagePath)
    : null;
  const imageSize = customImage && !customImage.isEmpty() ? customImage.getSize() : { width: 594, height: 840 };
  return { width, height: Math.round(width * imageSize.height / imageSize.width) };
}

function getLocalPetCharacterBounds(): Electron.Rectangle {
  const size = getPetCharacterSize();
  return {
    x: Math.round((PET_WINDOW_SIZE.width - size.width) / 2),
    y: Math.round((PET_WINDOW_SIZE.height - size.height) / 2),
    ...size,
  };
}

function getPetCharacterBounds(): Electron.Rectangle | null {
  if (!petWindow) return null;
  const windowBounds = petWindow.getBounds();
  const character = getLocalPetCharacterBounds();
  return { ...character, x: windowBounds.x + character.x, y: windowBounds.y + character.y };
}

function getLocalPetBubbleBounds(): Electron.Rectangle {
  const character = getLocalPetCharacterBounds();
  const centerX = PET_WINDOW_SIZE.width / 2;
  const centerY = PET_WINDOW_SIZE.height / 2;
  const gap = 14;
  const bubbles: Record<PetBubblePlacement, Electron.Rectangle> = {
    above: { x: Math.round(centerX - PET_BUBBLE_SIZE.width / 2), y: Math.round(centerY - character.height / 2 - gap - PET_BUBBLE_SIZE.height), ...PET_BUBBLE_SIZE },
    left: { x: Math.round(centerX - character.width / 2 - gap - PET_BUBBLE_SIZE.width), y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2), ...PET_BUBBLE_SIZE },
    right: { x: Math.round(centerX + character.width / 2 + gap), y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2), ...PET_BUBBLE_SIZE },
    below: { x: Math.round(centerX - PET_BUBBLE_SIZE.width / 2), y: Math.round(centerY + character.height / 2 + gap), ...PET_BUBBLE_SIZE },
  };
  return bubbles[petBubblePlacement];
}

function containsPoint(bounds: Electron.Rectangle, point: Electron.Point): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width
    && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}

function updatePetWindowMouseThrough(): void {
  if (!petWindow || isPetDragging) return;
  const windowBounds = petWindow.getBounds();
  const cursor = screen.getCursorScreenPoint();
  const localCursor = { x: cursor.x - windowBounds.x, y: cursor.y - windowBounds.y };
  const isInteractive = containsPoint(getLocalPetCharacterBounds(), localCursor)
    || (isPetExpanded && containsPoint(getLocalPetBubbleBounds(), localCursor));
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
  const availableAbove = bounds.y - workArea.y;
  const availableLeft = bounds.x - workArea.x;
  const availableRight = workArea.x + workArea.width - bounds.x - bounds.width;
  const availableBelow = workArea.y + workArea.height - bounds.y - bounds.height;
  if (availableAbove >= PET_BUBBLE_SIZE.height + 14) petBubblePlacement = 'above';
  else if (availableLeft >= PET_BUBBLE_SIZE.width + 14) petBubblePlacement = 'left';
  else if (availableRight >= PET_BUBBLE_SIZE.width + 14) petBubblePlacement = 'right';
  else petBubblePlacement = availableBelow >= PET_BUBBLE_SIZE.height + 14 ? 'below' : 'above';
  updatePetWindowMouseThrough();
  petWindow.webContents.send('pet:placement', petBubblePlacement);
}

function createPetWindow(): void {
  const workArea = screen.getPrimaryDisplay().workArea;
  const petX = workArea.x + workArea.width - 225;
  const petY = workArea.y + workArea.height - 290;
  const characterSize = getPetCharacterSize();
  petWindow = new BrowserWindow({
    ...PET_WINDOW_SIZE,
    x: petX - Math.round((PET_WINDOW_SIZE.width - characterSize.width) / 2),
    y: petY - Math.round((PET_WINDOW_SIZE.height - characterSize.height) / 2),
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
  // Windows 合成器偶尔会在首帧回退为不透明底色，加载后再次明确透明色。
  petWindow.webContents.once('did-finish-load', () => petWindow?.setBackgroundColor('#00000000'));
  loadView(petWindow, 'pet');
  petHitTestTimer = setInterval(updatePetWindowMouseThrough, 8);
  petWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      petWindow?.hide();
    }
  });
  petWindow.on('closed', () => {
    clearInterval(petHitTestTimer);
    petHitTestTimer = undefined;
    petWindow = null;
  });
}

function createPanelWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 640,
    height: 680,
    minWidth: 560,
    minHeight: 560,
    title: '桌宠文件粉碎器 · 设置',
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
    tray?.setToolTip('桌宠文件粉碎器');
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
    ? await installContextMenu(getExecutablePath())
    : await removeContextMenu();
  if (!succeeded) throw new Error(enabled ? '资源管理器右键菜单安装失败' : '资源管理器右键菜单卸载失败');
  currentSettings = await store.updateSettings({ contextMenuInstalled: enabled, contextMenuAutoInstall: false });
  settingsWindow?.webContents.send('settings:changed');
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: petWindow?.isVisible() ? '隐藏桌宠' : '显示桌宠', click: () => {
      if (petWindow?.isVisible()) petWindow.hide();
      else showPet();
      refreshTray();
    } },
    { label: '设置与日志…', click: showSettingsWindow },
  ]);
}

function refreshTray(): void {
  tray?.setContextMenu(buildTrayMenu());
}

function createTray(): void {
  const trayIcon = nativeImage.createFromPath(getIconPath()).resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);
  tray.setToolTip('桌宠文件粉碎器');
  tray.on('double-click', showPet);
  refreshTray();
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on('second-instance', (_event, argv) => queueLaunchPaths(parseLaunchPaths(argv)));
  app.whenReady().then(async () => {
    currentSettings = await store.getSettings();
    createPetWindow();
    onWindowDrag();
    createTray();
    if (!registerShortcut(currentSettings.shortcut)) {
      currentSettings = await store.updateSettings({ shortcut: 'CommandOrControl+Alt+X' });
      registerShortcut(currentSettings.shortcut);
    }

    // 资源管理器右键菜单仅由设置项控制，启动时只同步真实状态。
    const contextMenuInstalled = await isContextMenuInstalled(getExecutablePath());
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
ipcMain.on('ELECTRON_DRAG_START', (event) => {
  if (!petWindow || event.sender !== petWindow.webContents) return;
  isPetDragging = true;
  isPetWindowMouseThrough = false;
  petWindow.setIgnoreMouseEvents(false);
});
ipcMain.on('ELECTRON_DRAG_OVER', (event) => {
  if (!petWindow || event.sender !== petWindow.webContents) return;
  isPetDragging = false;
  updatePetWindowMouseThrough();
});
ipcMain.handle('context-menu:install', async () => { await setContextMenuEnabled(true); return true; });
ipcMain.handle('context-menu:remove', async () => { await setContextMenuEnabled(false); return true; });
ipcMain.handle('context-menu:status', () => isContextMenuInstalled(getExecutablePath()));
ipcMain.handle('settings:get', () => currentSettings);
ipcMain.handle('settings:update', async (_event, patch: Partial<AppSettings>) => {
  const safePatch = { ...patch };
  delete safePatch.customPetImagePath;
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
ipcMain.handle('pet-image:get', () => getCustomPetImageDataUrl());
ipcMain.handle('pet-image:choose', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择桌宠 PNG 图片',
    properties: ['openFile'],
    filters: [{ name: 'PNG 图片', extensions: ['png'] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const sourcePath = result.filePaths[0];
  if (nativeImage.createFromPath(sourcePath).isEmpty()) throw new Error('无法读取这张 PNG 图片');
  const targetPath = getCustomPetImagePath();
  await copyFile(sourcePath, targetPath);
  currentSettings = await store.updateSettings({ customPetImagePath: targetPath });
  notifyPetAppearanceChanged();
  return getCustomPetImageDataUrl();
});
ipcMain.handle('pet-image:reset', async () => {
  await rm(getCustomPetImagePath(), { force: true });
  currentSettings = await store.updateSettings({ customPetImagePath: '' });
  notifyPetAppearanceChanged();
  return '';
});
ipcMain.handle('logs:get', () => store.getLogs());
ipcMain.handle('logs:clear', async () => { await store.clearLogs(); return true; });
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
  clearInterval(petHitTestTimer);
  globalShortcut.unregisterAll();
});
