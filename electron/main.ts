import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  screen,
  Tray,
} from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, rm, stat } from 'node:fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { onWindowDrag } from 'electron-drag-window/electron';
import {
  ShredCancelledError,
  shredPaths,
  type ShredProgress,
  type ShredResult,
} from './shredder';
import {
  AppStore,
  type AppSettings,
  type ShredLog,
  type UploadedPetImage,
} from './store';
import {
  installContextMenu,
  isContextMenuInstalled,
  removeContextMenu,
  updateContextMenuIcon,
} from './windows-integration';
import { getExplorerSelection } from './windows-selection';

const currentDirectory = fileURLToPath(new URL('.', import.meta.url));
const store = new AppStore(app);
let petWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let currentSettings: AppSettings;
let isQuitting = false;
let isShredding = false;
let activeShredController: AbortController | null = null;
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
interface ShredTargetMetadata {
  path: string;
  targetType: 'file' | 'directory';
}

const BUILT_IN_PET_IMAGES = [
  {
    id: 'built-in-ao-yin',
    name: '默认',
    fileName: 'ao-yin.webp',
  },
] as const;
// 固定画布覆盖最大人物和四向气泡，透明区域通过动态鼠标穿透避免遮挡桌面。
const PET_WINDOW_SIZE = { width: 960, height: 1160 };
// 设置是尺寸最大的气泡，主进程按最大边界预判摆放方向和鼠标热区。
const PET_BUBBLE_SIZE = { width: 360, height: 540 };
const PET_SIZE_MIN = 50;
const PET_SIZE_MAX = 700;
const PET_TEMPLATE_THUMBNAIL_WIDTH = 192;
const PET_FADE_DURATION_MS = 180;
const PET_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const PROGRESS_UPDATE_INTERVAL_MS = 80;
const PATH_VALIDATION_CONCURRENCY = 16;
const MAX_RETAINED_SHRED_RESULTS = 1000;
const PET_IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};
let petBubblePlacement: PetBubblePlacement = 'left';
let isPetExpanded = false;
let isPetWindowMouseThrough = false;
let isPetDragging = false;
let petBubbleBounds: Electron.Rectangle | null = null;
let petDragStartPosition: Electron.Point | null = null;
let petCharacterSizeCache: {
  imagePath: string;
  width: number;
  size: Electron.Size;
} | null = null;
let petImageNaturalSize: {
  imagePath: string;
  width: number;
  height: number;
} | null = null;
const petTemplateThumbnailCache = new Map<string, string>();

// vite-plugin-electron 会在 preload 重新构建后通知主进程，刷新窗口即可载入新桥接代码。
if (process.env.VITE_DEV_SERVER_URL) {
  process.on('message', (message) => {
    if (message !== 'electron-vite&type=hot-reload') return;
    BrowserWindow.getAllWindows().forEach((window) =>
      window.webContents.reload(),
    );
  });
}

function getExecutablePath(): string {
  // portable 构建运行在临时目录，注册表和自启必须指向外层 EXE。
  return process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
}

function shouldShowPetOnLaunch(): boolean {
  if (process.argv.includes('--background')) return false;
  return (
    process.platform !== 'darwin' ||
    !app.getLoginItemSettings().wasOpenedAtLogin
  );
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
  const builtIn = BUILT_IN_PET_IMAGES.find(
    (image) => image.id === currentSettings.petImageTemplateId,
  );
  if (builtIn) return getBuiltInPetImagePath(builtIn.fileName);
  const uploaded = currentSettings.uploadedPetImages.find(
    (image) => image.id === currentSettings.petImageTemplateId,
  );
  if (uploaded) return getUploadedPetImagePath(uploaded);
  if (
    currentSettings.customPetImagePath &&
    existsSync(currentSettings.customPetImagePath)
  )
    return currentSettings.customPetImagePath;
  return getBuiltInPetImagePath(BUILT_IN_PET_IMAGES[0].fileName);
}

function imagePathToDataUrl(imagePath: string): string {
  if (!imagePath || !existsSync(imagePath)) return '';
  const mimeType = PET_IMAGE_MIME_TYPES[extname(imagePath).toLowerCase()];
  if (!mimeType) return '';
  try {
    // 保留原始图片数据，避免 GIF 动画在 nativeImage 转码后变成静态首帧。
    return `data:${mimeType};base64,${readFileSync(imagePath).toString('base64')}`;
  } catch {
    return '';
  }
}

function imagePathToThumbnailDataUrl(imagePath: string): string {
  if (!imagePath || !existsSync(imagePath)) return '';
  const cachedImage = petTemplateThumbnailCache.get(imagePath);
  if (cachedImage) return cachedImage;
  const image = nativeImage.createFromPath(imagePath);
  // SVG 等格式无法生成原生缩略图时，回退到浏览器可直接解码的原始数据。
  if (image.isEmpty()) return imagePathToDataUrl(imagePath);
  // 设置页仅显示小尺寸预览，避免把数 MB 原图经 IPC 传输并在窗口首次缩放时集中解码。
  const thumbnail = image
    .resize({ width: PET_TEMPLATE_THUMBNAIL_WIDTH, quality: 'good' })
    .toDataURL();
  petTemplateThumbnailCache.set(imagePath, thumbnail);
  return thumbnail;
}

function isValidPetImage(fileExtension: string, imageBuffer: Buffer): boolean {
  if (fileExtension === '.svg') {
    const content = imageBuffer
      .toString('utf8')
      .replace(/^\uFEFF/, '')
      .trimStart();
    return /^(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)*<svg(?:\s|>)/i.test(
      content,
    );
  }
  if (fileExtension === '.png')
    return imageBuffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (['.jpg', '.jpeg', '.jeg'].includes(fileExtension))
    return (
      imageBuffer[0] === 0xff &&
      imageBuffer[1] === 0xd8 &&
      imageBuffer[2] === 0xff
    );
  if (fileExtension === '.gif')
    return ['GIF87a', 'GIF89a'].includes(
      imageBuffer.subarray(0, 6).toString('ascii'),
    );
  if (fileExtension === '.webp')
    return (
      imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  return false;
}

function getPetImageDataUrl(): string {
  return imagePathToDataUrl(getActivePetImagePath());
}

function getPetImageTemplates(): PetImageTemplate[] {
  const activeId = currentSettings.petImageTemplateId;
  const builtInTemplates = BUILT_IN_PET_IMAGES.map((image) => ({
    id: image.id,
    name: image.name,
    image: imagePathToThumbnailDataUrl(getBuiltInPetImagePath(image.fileName)),
    builtIn: true,
    active: image.id === activeId,
    deletable: false,
  }));
  const uploadedTemplates = currentSettings.uploadedPetImages
    .filter((image) => existsSync(getUploadedPetImagePath(image)))
    .map((image) => ({
      id: image.id,
      name: image.name,
      image: imagePathToThumbnailDataUrl(getUploadedPetImagePath(image)),
      builtIn: false,
      active: image.id === activeId,
      deletable: true,
    }));
  // 配置中的模板丢失时，界面和桌宠都回退到第一个内置形象。
  if (
    ![...builtInTemplates, ...uploadedTemplates].some((image) => image.active)
  )
    builtInTemplates[0].active = true;
  return [...builtInTemplates, ...uploadedTemplates];
}

async function migrateLegacyPetImage(): Promise<void> {
  if (
    !currentSettings.customPetImagePath ||
    !existsSync(currentSettings.customPetImagePath) ||
    currentSettings.uploadedPetImages.length > 0
  )
    return;
  const id = randomUUID();
  const fileName = `${id}.png`;
  await mkdir(getPetImagesDirectory(), { recursive: true });
  await copyFile(
    currentSettings.customPetImagePath,
    join(getPetImagesDirectory(), fileName),
  );
  currentSettings = await store.updateSettings({
    customPetImagePath: '',
    petImageTemplateId: id,
    uploadedPetImages: [{ id, name: '我的桌宠', fileName }],
  });
}

function notifyPetAppearanceChanged(): void {
  petWindow?.webContents.send('settings:changed');
}

function parseLaunchPaths(argv: string[]): string[] {
  const marker = argv.indexOf('--shred');
  if (marker < 0) return [];
  return argv
    .slice(marker + 1)
    .map((item) => resolve(item))
    .filter(existsSync);
}

function parseClipboardPaths(): string[] {
  const candidates = [clipboard.readText(), clipboard.read('text/uri-list')];
  const fileName = clipboard.readBuffer('FileNameW');
  if (fileName.length > 0)
    candidates.push(fileName.toString('utf16le').replace(/\0+$/g, ''));
  return [
    ...new Set(
      candidates
        .flatMap((text) => text.split(/\r?\n/))
        .map((item) =>
          decodeURIComponent(
            item
              .trim()
              .replace(/^file:\/\//i, '')
              .replace(/^\/(?=[A-Za-z]:)/, ''),
          ),
        )
        .filter((item) => item.length > 0 && existsSync(item))
        .map((item) => resolve(item)),
    ),
  ];
}

async function loadView(window: BrowserWindow): Promise<void> {
  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }
  await window.loadFile(join(currentDirectory, '../dist-renderer/index.html'));
}

function animatePetOpacity(
  targetOpacity: number,
  onComplete?: () => void,
): void {
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
    const progress = Math.min(
      1,
      (Date.now() - startedAt) / PET_FADE_DURATION_MS,
    );
    const easedProgress = 1 - (1 - progress) ** 3;
    window.setOpacity(
      startOpacity + (targetOpacity - startOpacity) * easedProgress,
    );
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
  }
  animatePetOpacity(1);
}

function getPetCharacterSize(): Electron.Size {
  const width = Math.min(
    PET_SIZE_MAX,
    Math.max(PET_SIZE_MIN, Math.round(currentSettings.petSize)),
  );
  const imagePath = getActivePetImagePath();
  if (
    petCharacterSizeCache?.imagePath === imagePath &&
    petCharacterSizeCache.width === width
  ) {
    return petCharacterSizeCache.size;
  }
  // 图片或桌宠尺寸未变化时复用计算结果，避免命中检测反复读取和解码资源。
  const activeImage = nativeImage.createFromPath(imagePath);
  const imageSize =
    petImageNaturalSize?.imagePath === imagePath
      ? petImageNaturalSize
      : !activeImage.isEmpty()
        ? activeImage.getSize()
        : { width: 594, height: 840 };
  const size = {
    width,
    height: Math.round((width * imageSize.height) / imageSize.width),
  };
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
  return {
    ...character,
    x: windowBounds.x + character.x,
    y: windowBounds.y + character.y,
  };
}

function getRestoredPetWindowPosition(
  characterSize: Electron.Size,
  windowSize: Electron.Size,
): Electron.Point {
  const displays = screen.getAllDisplays();
  const savedDisplay = displays.find(
    (display) => display.id === currentSettings.petDisplayId,
  );
  const display = savedDisplay ?? screen.getPrimaryDisplay();
  const { workArea } = display;
  const hasSavedPosition =
    Number.isFinite(currentSettings.petPositionX) &&
    Number.isFinite(currentSettings.petPositionY);
  // 首次启动时让人物本体居中；已有拖拽位置时仍优先恢复用户保存的坐标。
  let characterX = Math.round(
    workArea.x + (workArea.width - characterSize.width) / 2,
  );
  let characterY = Math.round(
    workArea.y + (workArea.height - characterSize.height) / 2,
  );
  if (hasSavedPosition) {
    const relativeX = Math.min(
      1,
      Math.max(0, currentSettings.petPositionX as number),
    );
    const relativeY = Math.min(
      1,
      Math.max(0, currentSettings.petPositionY as number),
    );
    characterX = Math.round(
      workArea.x + relativeX * workArea.width - characterSize.width / 2,
    );
    characterY = Math.round(
      workArea.y + relativeY * workArea.height - characterSize.height / 2,
    );
  }
  // 只限制可见人物，允许用于气泡布局的透明画布自然延伸到工作区外。
  characterX = Math.min(
    workArea.x + Math.max(0, workArea.width - characterSize.width),
    Math.max(workArea.x, characterX),
  );
  characterY = Math.min(
    workArea.y + Math.max(0, workArea.height - characterSize.height),
    Math.max(workArea.y, characterY),
  );
  return {
    x: characterX - Math.round((windowSize.width - characterSize.width) / 2),
    y: characterY - Math.round((windowSize.height - characterSize.height) / 2),
  };
}

async function savePetPositionAfterDrag(): Promise<void> {
  if (
    !petWindow ||
    petWindow.isDestroyed() ||
    isPetDragging ||
    !petDragStartPosition
  )
    return;
  const bounds = getPetCharacterBounds();
  if (!bounds) return;
  const display = screen.getDisplayMatching(bounds);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const relativeX = Math.min(
    1,
    Math.max(0, (centerX - display.workArea.x) / display.workArea.width),
  );
  const relativeY = Math.min(
    1,
    Math.max(0, (centerY - display.workArea.y) / display.workArea.height),
  );
  currentSettings = await store.updateSettings({
    petDisplayId: display.id,
    petPositionX: relativeX,
    petPositionY: relativeY,
  });
}

function restorePetPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const [width, height] = petWindow.getSize();
  const position = getRestoredPetWindowPosition(getPetCharacterSize(), {
    width,
    height,
  });
  petWindow.setPosition(position.x, position.y);
}

function getLocalPetBubbleBounds(): Electron.Rectangle {
  const windowSize = getPetWindowSize();
  const character = getLocalPetCharacterBounds();
  const centerX = windowSize.width / 2;
  const centerY = windowSize.height / 2;
  const gap = 14;
  const bubbles: Record<PetBubblePlacement, Electron.Rectangle> = {
    left: {
      x: Math.round(
        centerX - character.width / 2 - gap - PET_BUBBLE_SIZE.width,
      ),
      y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2),
      ...PET_BUBBLE_SIZE,
    },
    right: {
      x: Math.round(centerX + character.width / 2 + gap),
      y: Math.round(centerY - PET_BUBBLE_SIZE.height / 2),
      ...PET_BUBBLE_SIZE,
    },
  };
  return bubbles[petBubblePlacement];
}

function containsPoint(
  bounds: Electron.Rectangle,
  point: Electron.Point,
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function expandBounds(
  bounds: Electron.Rectangle,
  padding: number,
): Electron.Rectangle {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

function updatePetWindowMouseThrough(pointer?: Electron.Point): void {
  if (
    !petWindow ||
    petWindow.isDestroyed() ||
    !petWindow.isVisible() ||
    isPetDragging
  )
    return;
  let localCursor = pointer;
  if (!localCursor) {
    const windowBounds = petWindow.getBounds();
    const cursor = screen.getCursorScreenPoint();
    localCursor = {
      x: cursor.x - windowBounds.x,
      y: cursor.y - windowBounds.y,
    };
  }
  const bubbleBounds = petBubbleBounds ?? getLocalPetBubbleBounds();
  const isInteractive =
    containsPoint(
      expandBounds(getLocalPetCharacterBounds(), 10),
      localCursor,
    ) ||
    (isPetExpanded &&
      containsPoint(expandBounds(bubbleBounds, 6), localCursor));
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
  petBubblePlacement =
    availableLeft >= PET_BUBBLE_SIZE.width + 14 ||
    availableLeft >= availableRight
      ? 'left'
      : 'right';
  updatePetWindowMouseThrough();
  petWindow.webContents.send('pet:placement', petBubblePlacement);
}

function createPetWindow(): void {
  const characterSize = getPetCharacterSize();
  const initialPosition = getRestoredPetWindowPosition(
    characterSize,
    PET_WINDOW_SIZE,
  );
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
    show: shouldShowPetOnLaunch(),
    webPreferences: {
      preload: join(currentDirectory, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Windows 可能按工作区限制超大透明窗口，创建后使用真实尺寸重新保持人物锚点。
  const actualWindowSize = petWindow.getSize();
  const actualPosition = getRestoredPetWindowPosition(characterSize, {
    width: actualWindowSize[0],
    height: actualWindowSize[1],
  });
  petWindow.setPosition(actualPosition.x, actualPosition.y);
  // Windows 合成器偶尔会在首帧回退为不透明底色，加载后再次明确透明色。
  petWindow.webContents.once('did-finish-load', () =>
    petWindow?.setBackgroundColor('#00000000'),
  );
  loadView(petWindow);
  petWindow.on('close', (event) => {
    // 桌宠不再维护独立隐藏状态，程序只能通过托盘“关闭”完整退出。
    if (!isQuitting) event.preventDefault();
  });
  petWindow.on('closed', () => {
    clearInterval(petFadeTimer);
    petFadeTimer = undefined;
    petDragStartPosition = null;
    petWindow = null;
  });
}

function showSettingsBubble(): void {
  // 托盘与气泡内入口共用同一设置界面，不再创建第二个 BrowserWindow。
  showPet();
  setPetExpanded(true);
  if (!petWindow) return;
  if (petWindow.webContents.isLoading()) {
    petWindow.webContents.once('did-finish-load', () =>
      petWindow?.webContents.send('pet:open-settings'),
    );
    return;
  }
  petWindow.webContents.send('pet:open-settings');
}

function applyLoginSetting(enabled: boolean): void {
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: getExecutablePath(),
      args: ['--background'],
    });
    return;
  }
  if (process.platform === 'darwin')
    app.setLoginItemSettings({ openAtLogin: enabled });
}

function registerShortcut(shortcut: string): boolean {
  globalShortcut.unregisterAll();
  return globalShortcut.register(shortcut, handleShortcut);
}

function classifyResult(
  path: string,
  success: boolean,
  error?: string,
): Omit<ShredLog, 'id' | 'timestamp'> {
  if (success)
    return { path, success, category: 'success', message: '粉碎成功' };
  const message = error ?? '未知错误';
  if (/保护目录/.test(message))
    return { path, success, category: 'protected', message };
  if (/EPERM|EACCES|permission/i.test(message))
    return {
      path,
      success,
      category: 'permission',
      message: `权限不足：${message}`,
    };
  if (/EBUSY|occupied|used by another/i.test(message))
    return {
      path,
      success,
      category: 'occupied',
      message: `文件被占用：${message}`,
    };
  return { path, success, category: 'unknown', message };
}

async function getShredTargetMetadata(
  paths: string[],
): Promise<ShredTargetMetadata[]> {
  return Promise.all(
    paths.map(async (path) => {
      const stats = await lstat(path);
      return {
        path,
        targetType:
          stats.isDirectory() && !stats.isSymbolicLink() ? 'directory' : 'file',
      };
    }),
  );
}

function isPathWithinDirectory(
  directoryPath: string,
  targetPath: string,
): boolean {
  const relativePath = relative(directoryPath, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

function createShredLogs(
  targets: ShredTargetMetadata[],
  results: ShredResult[],
): Array<Omit<ShredLog, 'id' | 'timestamp'>> {
  const logs: Array<Omit<ShredLog, 'id' | 'timestamp'>> = [];
  for (const target of targets) {
    const targetResults = results.filter((result) =>
      target.targetType === 'directory'
        ? isPathWithinDirectory(target.path, result.path)
        : result.path === target.path,
    );
    if (targetResults.length === 0) continue;
    if (target.targetType === 'file') {
      const result = targetResults[0];
      logs.push({
        ...classifyResult(result.path, result.success, result.error),
        targetType: 'file',
      });
      continue;
    }
    const succeededCount = targetResults.reduce(
      (total, result) => total + result.deletedFileCount,
      0,
    );
    const failedResults = targetResults.filter((result) => !result.success);
    const failedCount = failedResults.length;
    const success = failedCount === 0;
    // 文件夹日志只保留顶层目标和数量汇总，避免泄露或堆积大量子文件路径。
    logs.push({
      ...classifyResult(target.path, success, failedResults[0]?.error),
      targetType: 'directory',
      succeededCount,
      failedCount,
      message: `成功 ${succeededCount} 个，失败 ${failedCount} 个`,
    });
  }
  return logs;
}

async function normalizeTargets(paths: string[]): Promise<string[]> {
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  const validPaths = new Array<string | undefined>(uniquePaths.length);
  let nextIndex = 0;

  async function validateNextPath(): Promise<void> {
    while (nextIndex < uniquePaths.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        // 异步且有限并发地访问磁盘，避免超大选区用同步 existsSync 阻塞所有窗口事件。
        await stat(uniquePaths[currentIndex]);
        validPaths[currentIndex] = uniquePaths[currentIndex];
      } catch {
        validPaths[currentIndex] = undefined;
      }
    }
  }

  const workerCount = Math.min(PATH_VALIDATION_CONCURRENCY, uniquePaths.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => validateNextPath()),
  );
  return validPaths.filter((path): path is string => Boolean(path));
}

async function requestPetConfirmation(paths: string[]): Promise<void> {
  const targets = await normalizeTargets(paths);
  if (targets.length === 0) return;
  showPet();
  setPetExpanded(true);
  petWindow?.webContents.send('pet:confirm', targets, currentSettings.passes);
}

async function requestShred(
  paths: string[],
  passes: 0 | 3 | 7 | 35 = currentSettings.passes,
) {
  const targets = await normalizeTargets(paths);
  if (targets.length === 0 || isShredding) return [];
  const targetMetadata = await getShredTargetMetadata(targets);

  isShredding = true;
  const controller = new AbortController();
  activeShredController = controller;
  petWindow?.webContents.send('pet:state', 'working');
  const startedAt = Date.now();
  let pendingProgress: ShredProgress | null = null;
  let lastProgressSentAt = 0;
  let progressTimer: NodeJS.Timeout | undefined;

  function dispatchProgress(): void {
    if (!pendingProgress) return;
    const progress = pendingProgress;
    pendingProgress = null;
    lastProgressSentAt = Date.now();
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = undefined;
    }
    tray?.setToolTip(`正在粉碎 ${progress.fileIndex}/${progress.fileCount}`);
    petWindow?.webContents.send('pet:progress', progress);
  }

  function reportProgress(progress: ShredProgress): void {
    pendingProgress = progress;
    const elapsed = Date.now() - lastProgressSentAt;
    if (elapsed >= PROGRESS_UPDATE_INTERVAL_MS) {
      dispatchProgress();
      return;
    }
    // 合并高频文件与分块进度，只保留间隔内的最新状态，防止 IPC 淹没渲染进程。
    if (!progressTimer)
      progressTimer = setTimeout(
        dispatchProgress,
        PROGRESS_UPDATE_INTERVAL_MS - elapsed,
      );
  }

  try {
    const results = await shredPaths(
      targets,
      passes,
      reportProgress,
      controller.signal,
    );
    dispatchProgress();
    const durationMs = Date.now() - startedAt;
    const retainedResults = results.slice(0, MAX_RETAINED_SHRED_RESULTS);
    await store.appendLogs(createShredLogs(targetMetadata, results));
    const failedCount = results.reduce(
      (total, result) => total + Number(!result.success),
      0,
    );
    const succeeded = results.reduce(
      (total, result) => total + result.deletedFileCount,
      0,
    );
    petWindow?.webContents.send(
      'pet:state',
      failedCount === 0 ? 'success' : 'failure',
    );
    petWindow?.webContents.send('pet:complete', {
      succeeded,
      failed: failedCount,
      durationMs,
      cancelled: false,
    });
    if (Notification.isSupported()) {
      new Notification({
        title: failedCount === 0 ? '文件粉碎完成' : '部分目标粉碎失败',
        body:
          failedCount === 0
            ? `已永久删除 ${succeeded} 个文件`
            : `已删除 ${succeeded} 个文件，${failedCount} 个项目失败`,
        icon: getIconPath(),
      }).show();
    }
    // 渲染端只判断任务是否启动；限制明细回传体积，避免结构化克隆数万结果造成内存峰值。
    return retainedResults;
  } catch (error) {
    if (!(error instanceof ShredCancelledError)) throw error;
    dispatchProgress();
    const durationMs = Date.now() - startedAt;
    const retainedResults = error.results.slice(0, MAX_RETAINED_SHRED_RESULTS);
    const failedCount = error.results.reduce(
      (total, result) => total + Number(!result.success),
      0,
    );
    const succeeded = error.deletedFileCount;
    if (retainedResults.length > 0) {
      await store.appendLogs(createShredLogs(targetMetadata, error.results));
    }
    petWindow?.webContents.send('pet:state', 'idle');
    petWindow?.webContents.send('pet:complete', {
      succeeded,
      failed: failedCount,
      durationMs,
      cancelled: true,
    });
    return retainedResults;
  } finally {
    if (progressTimer) clearTimeout(progressTimer);
    pendingProgress = null;
    if (activeShredController === controller) activeShredController = null;
    isShredding = false;
    tray?.setToolTip('文件粉碎精灵');
    setTimeout(() => petWindow?.webContents.send('pet:state', 'idle'), 1800);
    petWindow?.webContents.send('logs:updated');
  }
}

async function handleShortcut(): Promise<void> {
  const selectedPaths = await getExplorerSelection();
  const paths =
    selectedPaths.length > 0 ? selectedPaths : parseClipboardPaths();
  if (paths.length > 0) {
    await requestPetConfirmation(paths);
    return;
  }
  if (Notification.isSupported()) {
    new Notification({
      title: '未读取到选中项',
      body: '请在资源管理器中选择文件后重试',
      icon: getIconPath(),
    }).show();
  }
}

function queueLaunchPaths(paths: string[]): void {
  queuedLaunchPaths = [...new Set([...queuedLaunchPaths, ...paths])];
  clearTimeout(launchTimer);
  launchTimer = setTimeout(async () => {
    const targets = queuedLaunchPaths;
    queuedLaunchPaths = [];
    await requestPetConfirmation(targets);
  }, 260);
}

async function setContextMenuEnabled(enabled: boolean): Promise<void> {
  const succeeded = enabled
    ? await installContextMenu(getExecutablePath(), getWindowsIconPath())
    : await removeContextMenu();
  if (!succeeded)
    throw new Error(
      enabled ? '资源管理器右键菜单安装失败' : '资源管理器右键菜单卸载失败',
    );
  currentSettings = await store.updateSettings({
    contextMenuInstalled: enabled,
    contextMenuAutoInstall: false,
  });
  petWindow?.webContents.send('settings:changed');
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: '关闭',
      click: () => {
        // 托盘关闭表示退出程序，保留用户设置和已安装的系统集成。
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray(): void {
  const trayIcon = nativeImage
    .createFromPath(getIconPath())
    .resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);
  tray.setToolTip('文件粉碎精灵');
  tray.on('click', showSettingsBubble);
  if (process.platform === 'darwin')
    tray.on('right-click', () => tray?.popUpContextMenu(buildTrayMenu()));
  // macOS 左键仅打开设置，其他平台直接使用静态托盘菜单。
  tray.setContextMenu(process.platform === 'darwin' ? null : buildTrayMenu());
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on('second-instance', (_event, argv) =>
    queueLaunchPaths(parseLaunchPaths(argv)),
  );
  app.whenReady().then(async () => {
    currentSettings = await store.getSettings();
    await migrateLegacyPetImage();
    createPetWindow();
    onWindowDrag();
    screen.on('display-removed', restorePetPosition);
    screen.on('display-metrics-changed', restorePetPosition);
    createTray();
    if (!registerShortcut(currentSettings.shortcut)) {
      currentSettings = await store.updateSettings({
        shortcut: 'CommandOrControl+Alt+X',
      });
      registerShortcut(currentSettings.shortcut);
    }

    // 资源管理器右键菜单仅由设置项控制，启动时只同步真实状态。
    if (process.platform === 'win32')
      await updateContextMenuIcon(getWindowsIconPath());
    const contextMenuInstalled =
      process.platform === 'win32'
        ? await isContextMenuInstalled(getExecutablePath())
        : false;
    // 已安装的菜单在启动时重写一次图标值，确保升级图标后立即同步到资源管理器。
    if (process.platform === 'win32' && contextMenuInstalled) {
      await installContextMenu(getExecutablePath(), getWindowsIconPath());
    }
    currentSettings = await store.updateSettings({
      contextMenuInstalled,
      contextMenuAutoInstall: false,
    });
    queueLaunchPaths(parseLaunchPaths(process.argv));
  });
}

ipcMain.handle('targets:choose', async (_event, kind: 'file' | 'directory') => {
  const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> =
    kind === 'file'
      ? ['openFile', 'multiSelections']
      : ['openDirectory', 'multiSelections'];
  const result = await dialog.showOpenDialog({ properties });
  return result.canceled ? [] : result.filePaths;
});
ipcMain.handle('shred:prepare', async (_event, paths: unknown) => {
  if (!Array.isArray(paths) || !paths.every((item) => typeof item === 'string'))
    throw new Error('无效的路径参数');
  return normalizeTargets(paths);
});
ipcMain.handle(
  'shred:start',
  async (_event, paths: unknown, passes: unknown) => {
    if (
      !Array.isArray(paths) ||
      !paths.every((item) => typeof item === 'string')
    )
      throw new Error('无效的路径参数');
    if (passes !== 0 && passes !== 3 && passes !== 7 && passes !== 35)
      throw new Error('无效的清除强度');
    return requestShred(paths, passes);
  },
);
ipcMain.handle('shred:cancel', () => {
  if (!activeShredController || activeShredController.signal.aborted)
    return false;
  activeShredController.abort();
  return true;
});
ipcMain.on('pet:expanded', (_event, expanded: boolean) =>
  setPetExpanded(Boolean(expanded)),
);
ipcMain.on('pet:bubble-bounds', (_event, bounds: unknown) => {
  if (bounds === null) {
    petBubbleBounds = null;
    updatePetWindowMouseThrough();
    return;
  }
  if (!bounds || typeof bounds !== 'object') return;
  const candidate = bounds as Partial<Electron.Rectangle>;
  if (
    ![candidate.x, candidate.y, candidate.width, candidate.height].every(
      Number.isFinite,
    )
  )
    return;
  petBubbleBounds = {
    x: Math.round(candidate.x as number),
    y: Math.round(candidate.y as number),
    width: Math.round(candidate.width as number),
    height: Math.round(candidate.height as number),
  };
  updatePetWindowMouseThrough();
});
ipcMain.on('pet:pointer-move', (event, pointer: unknown) => {
  if (
    !petWindow ||
    event.sender !== petWindow.webContents ||
    !pointer ||
    typeof pointer !== 'object'
  )
    return;
  const candidate = pointer as Partial<Electron.Point>;
  if (![candidate.x, candidate.y].every(Number.isFinite)) return;
  updatePetWindowMouseThrough({
    x: candidate.x as number,
    y: candidate.y as number,
  });
});
ipcMain.on('pet:image-size', (event, size: unknown) => {
  if (
    !petWindow ||
    event.sender !== petWindow.webContents ||
    !size ||
    typeof size !== 'object'
  )
    return;
  const candidate = size as Partial<Electron.Size>;
  if (![candidate.width, candidate.height].every(Number.isFinite)) return;
  const width = Math.round(candidate.width as number);
  const height = Math.round(candidate.height as number);
  if (width <= 0 || height <= 0) return;
  // 动态 WebP 无法由 nativeImage 解码，使用 Chromium 实际渲染尺寸校准点击热区。
  petImageNaturalSize = { imagePath: getActivePetImagePath(), width, height };
  petCharacterSizeCache = null;
  updatePetWindowMouseThrough();
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
  const hasMoved = Boolean(
    petDragStartPosition &&
    (petDragStartPosition.x !== x || petDragStartPosition.y !== y),
  );
  if (!hasMoved) {
    petDragStartPosition = null;
    return;
  }
  // 只在一次真实拖拽结束后持久化，程序恢复位置和普通窗口事件不再写磁盘。
  try {
    await savePetPositionAfterDrag();
  } catch (error) {
    console.error('保存桌宠位置失败', error);
  } finally {
    petDragStartPosition = null;
  }
});
ipcMain.handle('context-menu:install', async () => {
  await setContextMenuEnabled(true);
  return true;
});
ipcMain.handle('context-menu:remove', async () => {
  await setContextMenuEnabled(false);
  return true;
});
ipcMain.handle('context-menu:status', () =>
  isContextMenuInstalled(getExecutablePath()),
);
ipcMain.handle('settings:get', () => currentSettings);
ipcMain.handle(
  'settings:update',
  async (_event, patch: Partial<AppSettings>) => {
    const safePatch = { ...patch };
    delete safePatch.customPetImagePath;
    delete safePatch.petImageTemplateId;
    delete safePatch.uploadedPetImages;
    if (typeof safePatch.petSize === 'number') {
      safePatch.petSize = Math.min(
        PET_SIZE_MAX,
        Math.max(PET_SIZE_MIN, Math.round(safePatch.petSize)),
      );
    }
    if (
      safePatch.shortcut &&
      safePatch.shortcut !== currentSettings.shortcut &&
      !registerShortcut(safePatch.shortcut)
    ) {
      registerShortcut(currentSettings.shortcut);
      throw new Error('快捷键无效或已被其他程序占用');
    }
    if (
      typeof safePatch.contextMenuInstalled === 'boolean' &&
      safePatch.contextMenuInstalled !== currentSettings.contextMenuInstalled
    ) {
      await setContextMenuEnabled(safePatch.contextMenuInstalled);
    }
    currentSettings = await store.updateSettings({
      ...safePatch,
      contextMenuAutoInstall: false,
    });
    petWindow?.setAlwaysOnTop(currentSettings.alwaysOnTop);
    if (typeof safePatch.launchAtLogin === 'boolean')
      applyLoginSetting(safePatch.launchAtLogin);
    notifyPetAppearanceChanged();
    return currentSettings;
  },
);
ipcMain.handle('pet-image:get', () => getPetImageDataUrl());
ipcMain.handle('pet-image:list', () => getPetImageTemplates());
ipcMain.handle('pet-image:choose', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: '选择桌宠图片',
      properties: ['openFile'],
      filters: [
        {
          name: '支持的图片',
          extensions: ['png', 'jpg', 'jpeg', 'jeg', 'svg', 'webp', 'gif'],
        },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const sourcePath = result.filePaths[0];
    const fileExtension = extname(sourcePath).toLowerCase();
    if (!PET_IMAGE_MIME_TYPES[fileExtension])
      throw new Error('仅支持 PNG、JPG、JPEG、SVG、WebP 和 GIF 图片');
    const sourceStats = await stat(sourcePath);
    if (sourceStats.size > PET_IMAGE_MAX_BYTES)
      throw new Error('桌宠图片不能超过 50 MB');
    const imageBuffer = await readFile(sourcePath);
    if (imageBuffer.byteLength > PET_IMAGE_MAX_BYTES)
      throw new Error('桌宠图片不能超过 50 MB');
    if (!isValidPetImage(fileExtension, imageBuffer))
      throw new Error('图片文件已损坏或格式与扩展名不符');
    const id = randomUUID();
    // 保留扩展名才能让 Chromium 按原格式解码，并继续播放 GIF 动画。
    const fileName = `${id}${fileExtension}`;
    await mkdir(getPetImagesDirectory(), { recursive: true });
    const targetPath = join(getPetImagesDirectory(), fileName);
    await copyFile(sourcePath, targetPath);
    const uploadedPetImages = [
      ...currentSettings.uploadedPetImages,
      {
        id,
        name: basename(sourcePath, fileExtension) || '我的桌宠',
        fileName,
      },
    ];
    currentSettings = await store.updateSettings({
      customPetImagePath: '',
      petImageTemplateId: id,
      uploadedPetImages,
    });
    notifyPetAppearanceChanged();
    return getPetImageTemplates();
  } finally {
    // 原生文件选择器会让透明窗口失焦，结束后恢复到设置气泡。
    petWindow?.webContents.send('pet:open-settings');
  }
});
ipcMain.handle('pet-image:select', async (_event, id: unknown) => {
  if (typeof id !== 'string') throw new Error('无效的桌宠模板');
  const exists =
    BUILT_IN_PET_IMAGES.some((image) => image.id === id) ||
    currentSettings.uploadedPetImages.some(
      (image) => image.id === id && existsSync(getUploadedPetImagePath(image)),
    );
  if (!exists) throw new Error('桌宠模板不存在');
  currentSettings = await store.updateSettings({ petImageTemplateId: id });
  notifyPetAppearanceChanged();
  return getPetImageTemplates();
});
ipcMain.handle('pet-image:delete', async (_event, id: unknown) => {
  if (typeof id !== 'string') throw new Error('无效的桌宠模板');
  const target = currentSettings.uploadedPetImages.find(
    (image) => image.id === id,
  );
  if (!target) throw new Error('内置模板不能删除');
  await rm(getUploadedPetImagePath(target), { force: true });
  const uploadedPetImages = currentSettings.uploadedPetImages.filter(
    (image) => image.id !== id,
  );
  currentSettings = await store.updateSettings({
    petImageTemplateId:
      currentSettings.petImageTemplateId === id
        ? BUILT_IN_PET_IMAGES[0].id
        : currentSettings.petImageTemplateId,
    uploadedPetImages,
  });
  notifyPetAppearanceChanged();
  return getPetImageTemplates();
});
ipcMain.handle('logs:get', () => store.getLogs());
ipcMain.handle('logs:delete', (_event, ids: unknown) => {
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
    throw new Error('无效的粉碎记录参数');
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
app.on('window-all-closed', () => undefined);
app.on('will-quit', () => {
  clearTimeout(launchTimer);
  clearInterval(petFadeTimer);
  globalShortcut.unregisterAll();
});
