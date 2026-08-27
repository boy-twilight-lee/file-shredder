import { app, BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { join } from 'node:path';
import type { AppSettings } from '../storage';

interface PetWindowManagerDependencies {
  runtimeDirectory: string;
  getSettings: () => AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  getActiveImagePath: () => string;
  isQuitting: () => boolean;
}

export interface PetWindowManager {
  create: () => void;
  dispose: () => void;
  restorePosition: () => void;
  send: (channel: string, ...args: unknown[]) => void;
  setAlwaysOnTop: (enabled: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  show: () => void;
  showSettings: () => void;
}

type PetBubblePlacement = 'left' | 'right';

// 固定画布覆盖最大人物和四向气泡，透明区域通过动态鼠标穿透避免遮挡桌面。
const PET_WINDOW_SIZE = { width: 960, height: 1160 };
// 设置是尺寸最大的气泡，主进程按最大边界预判摆放方向和鼠标热区。
const PET_BUBBLE_SIZE = { width: 360, height: 540 };
const PET_SIZE_MIN = 50;
const PET_SIZE_MAX = 700;
const PET_FADE_DURATION_MS = 180;

export function createPetWindowManager(
  dependencies: PetWindowManagerDependencies,
): PetWindowManager {
  let petWindow: BrowserWindow | null = null;
  let fadeTimer: NodeJS.Timeout | undefined;
  let bubblePlacement: PetBubblePlacement = 'left';
  let isExpanded = false;
  let isMouseThrough = false;
  let isDragging = false;
  let bubbleBounds: Electron.Rectangle | null = null;
  let dragStartPosition: Electron.Point | null = null;
  let characterSizeCache: {
    imagePath: string;
    width: number;
    size: Electron.Size;
  } | null = null;
  let imageNaturalSize: {
    imagePath: string;
    width: number;
    height: number;
  } | null = null;

  function shouldShowOnLaunch(): boolean {
    if (process.argv.includes('--background')) return false;
    return (
      process.platform !== 'darwin' ||
      !app.getLoginItemSettings().wasOpenedAtLogin
    );
  }

  async function loadView(window: BrowserWindow): Promise<void> {
    if (process.env.VITE_DEV_SERVER_URL) {
      await window.loadURL(process.env.VITE_DEV_SERVER_URL);
      return;
    }
    await window.loadFile(
      join(dependencies.runtimeDirectory, '../dist-renderer/index.html'),
    );
  }

  function animateOpacity(targetOpacity: number): void {
    const window = petWindow;
    if (!window || window.isDestroyed()) return;
    clearInterval(fadeTimer);
    const startOpacity = window.getOpacity();
    const startedAt = Date.now();
    fadeTimer = setInterval(() => {
      if (window.isDestroyed() || petWindow !== window) {
        clearInterval(fadeTimer);
        fadeTimer = undefined;
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
      clearInterval(fadeTimer);
      fadeTimer = undefined;
    }, 16);
  }

  function show(): void {
    if (!petWindow) return;
    if (!petWindow.isVisible()) {
      petWindow.setOpacity(0);
      petWindow.showInactive();
    }
    animateOpacity(1);
  }

  function getCharacterSize(): Electron.Size {
    const width = Math.min(
      PET_SIZE_MAX,
      Math.max(PET_SIZE_MIN, Math.round(dependencies.getSettings().petSize)),
    );
    const imagePath = dependencies.getActiveImagePath();
    if (
      characterSizeCache?.imagePath === imagePath &&
      characterSizeCache.width === width
    )
      return characterSizeCache.size;
    // 图片或桌宠尺寸未变化时复用计算结果，避免命中检测反复读取和解码资源。
    const activeImage = nativeImage.createFromPath(imagePath);
    const imageSize =
      imageNaturalSize?.imagePath === imagePath
        ? imageNaturalSize
        : !activeImage.isEmpty()
          ? activeImage.getSize()
          : { width: 594, height: 840 };
    const size = {
      width,
      height: Math.round((width * imageSize.height) / imageSize.width),
    };
    characterSizeCache = { imagePath, width, size };
    return size;
  }

  function getWindowSize(): Electron.Size {
    if (!petWindow) return PET_WINDOW_SIZE;
    const bounds = petWindow.getContentBounds();
    return { width: bounds.width, height: bounds.height };
  }

  function getLocalCharacterBounds(): Electron.Rectangle {
    const windowSize = getWindowSize();
    const size = getCharacterSize();
    return {
      x: Math.round((windowSize.width - size.width) / 2),
      y: Math.round((windowSize.height - size.height) / 2),
      ...size,
    };
  }

  function getCharacterBounds(): Electron.Rectangle | null {
    if (!petWindow) return null;
    const windowBounds = petWindow.getBounds();
    const character = getLocalCharacterBounds();
    return {
      ...character,
      x: windowBounds.x + character.x,
      y: windowBounds.y + character.y,
    };
  }

  function getRestoredPosition(
    characterSize: Electron.Size,
    windowSize: Electron.Size,
  ): Electron.Point {
    const settings = dependencies.getSettings();
    const displays = screen.getAllDisplays();
    const savedDisplay = displays.find(
      (display) => display.id === settings.petDisplayId,
    );
    const display = savedDisplay ?? screen.getPrimaryDisplay();
    const { workArea } = display;
    const hasSavedPosition =
      Number.isFinite(settings.petPositionX) &&
      Number.isFinite(settings.petPositionY);
    let characterX = Math.round(
      workArea.x + (workArea.width - characterSize.width) / 2,
    );
    let characterY = Math.round(
      workArea.y + (workArea.height - characterSize.height) / 2,
    );
    if (hasSavedPosition) {
      const relativeX = Math.min(
        1,
        Math.max(0, settings.petPositionX as number),
      );
      const relativeY = Math.min(
        1,
        Math.max(0, settings.petPositionY as number),
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
      y:
        characterY - Math.round((windowSize.height - characterSize.height) / 2),
    };
  }

  async function savePositionAfterDrag(): Promise<void> {
    if (
      !petWindow ||
      petWindow.isDestroyed() ||
      isDragging ||
      !dragStartPosition
    )
      return;
    const bounds = getCharacterBounds();
    if (!bounds) return;
    const display = screen.getDisplayMatching(bounds);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    await dependencies.updateSettings({
      petDisplayId: display.id,
      petPositionX: Math.min(
        1,
        Math.max(0, (centerX - display.workArea.x) / display.workArea.width),
      ),
      petPositionY: Math.min(
        1,
        Math.max(0, (centerY - display.workArea.y) / display.workArea.height),
      ),
    });
  }

  function restorePosition(): void {
    if (!petWindow || petWindow.isDestroyed()) return;
    const [width, height] = petWindow.getSize();
    const position = getRestoredPosition(getCharacterSize(), { width, height });
    petWindow.setPosition(position.x, position.y);
  }

  function getLocalBubbleBounds(): Electron.Rectangle {
    const windowSize = getWindowSize();
    const character = getLocalCharacterBounds();
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
    return bubbles[bubblePlacement];
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

  function updateMouseThrough(pointer?: Electron.Point): void {
    if (
      !petWindow ||
      petWindow.isDestroyed() ||
      !petWindow.isVisible() ||
      isDragging
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
    const interactiveBubbleBounds = bubbleBounds ?? getLocalBubbleBounds();
    const isInteractive =
      containsPoint(expandBounds(getLocalCharacterBounds(), 10), localCursor) ||
      (isExpanded &&
        containsPoint(expandBounds(interactiveBubbleBounds, 6), localCursor));
    if (isMouseThrough === !isInteractive) return;
    isMouseThrough = !isInteractive;
    // 透明区域点击穿透，forward 保留鼠标移动以便重新进入人物时恢复交互。
    petWindow.setIgnoreMouseEvents(isMouseThrough, { forward: true });
  }

  function setExpanded(expanded: boolean): void {
    if (!petWindow) return;
    isExpanded = expanded;
    if (!expanded) {
      updateMouseThrough();
      return;
    }
    const bounds = getCharacterBounds();
    if (!bounds) return;
    const workArea = screen.getDisplayMatching(bounds).workArea;
    const availableLeft = bounds.x - workArea.x;
    const availableRight =
      workArea.x + workArea.width - bounds.x - bounds.width;
    bubblePlacement =
      availableLeft >= PET_BUBBLE_SIZE.width + 14 ||
      availableLeft >= availableRight
        ? 'left'
        : 'right';
    updateMouseThrough();
    petWindow.webContents.send('pet:placement', bubblePlacement);
  }

  function create(): void {
    const settings = dependencies.getSettings();
    const characterSize = getCharacterSize();
    const initialPosition = getRestoredPosition(characterSize, PET_WINDOW_SIZE);
    petWindow = new BrowserWindow({
      ...PET_WINDOW_SIZE,
      ...initialPosition,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      resizable: false,
      alwaysOnTop: settings.alwaysOnTop,
      skipTaskbar: true,
      hasShadow: false,
      show: shouldShowOnLaunch(),
      webPreferences: {
        preload: join(dependencies.runtimeDirectory, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    const actualWindowSize = petWindow.getSize();
    const actualPosition = getRestoredPosition(characterSize, {
      width: actualWindowSize[0],
      height: actualWindowSize[1],
    });
    petWindow.setPosition(actualPosition.x, actualPosition.y);
    petWindow.webContents.once('did-finish-load', () =>
      petWindow?.setBackgroundColor('#00000000'),
    );
    loadView(petWindow);
    petWindow.on('close', (event) => {
      if (!dependencies.isQuitting()) event.preventDefault();
    });
    petWindow.on('closed', () => {
      clearInterval(fadeTimer);
      fadeTimer = undefined;
      dragStartPosition = null;
      petWindow = null;
    });
  }

  function showSettings(): void {
    show();
    setExpanded(true);
    if (!petWindow) return;
    if (petWindow.webContents.isLoading()) {
      petWindow.webContents.once('did-finish-load', () =>
        petWindow?.webContents.send('pet:open-settings'),
      );
      return;
    }
    petWindow.webContents.send('pet:open-settings');
  }

  function send(channel: string, ...args: unknown[]): void {
    petWindow?.webContents.send(channel, ...args);
  }

  function setAlwaysOnTop(enabled: boolean): void {
    petWindow?.setAlwaysOnTop(enabled);
  }

  ipcMain.on('pet:expanded', (_event, expanded: boolean) =>
    setExpanded(Boolean(expanded)),
  );
  ipcMain.on('pet:bubble-bounds', (_event, bounds: unknown) => {
    if (bounds === null) {
      bubbleBounds = null;
      updateMouseThrough();
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
    bubbleBounds = {
      x: Math.round(candidate.x as number),
      y: Math.round(candidate.y as number),
      width: Math.round(candidate.width as number),
      height: Math.round(candidate.height as number),
    };
    updateMouseThrough();
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
    updateMouseThrough({
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
    imageNaturalSize = {
      imagePath: dependencies.getActiveImagePath(),
      width,
      height,
    };
    characterSizeCache = null;
    updateMouseThrough();
  });
  ipcMain.on('ELECTRON_DRAG_START', (event) => {
    if (!petWindow || event.sender !== petWindow.webContents) return;
    isDragging = true;
    const [x, y] = petWindow.getPosition();
    dragStartPosition = { x, y };
    isMouseThrough = false;
    petWindow.setIgnoreMouseEvents(false);
  });
  ipcMain.on('ELECTRON_DRAG_OVER', async (event) => {
    if (!petWindow || event.sender !== petWindow.webContents) return;
    isDragging = false;
    updateMouseThrough();
    const [x, y] = petWindow.getPosition();
    const hasMoved = Boolean(
      dragStartPosition &&
      (dragStartPosition.x !== x || dragStartPosition.y !== y),
    );
    if (!hasMoved) {
      dragStartPosition = null;
      return;
    }
    try {
      await savePositionAfterDrag();
    } catch (error) {
      console.error('保存桌宠位置失败', error);
    } finally {
      dragStartPosition = null;
    }
  });

  return {
    create,
    dispose: () => clearInterval(fadeTimer),
    restorePosition,
    send,
    setAlwaysOnTop,
    setExpanded,
    show,
    showSettings,
  };
}
