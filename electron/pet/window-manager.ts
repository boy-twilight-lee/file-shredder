import { app, BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { join } from 'node:path';
import { AppSettings } from '../storage';
import { clamp, containsPoint, expandRectangle } from '@/utils';
import {
  PET_BUBBLE_GAP,
  PET_BUBBLE_MAX_SIZE,
  PET_WINDOW_PADDING,
} from '@/constants';
interface PetWindowManagerDependencies {
  runtimeDirectory: string;
  getSettings: () => AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>;
  getActiveImagePath: () => string;
  isQuitting: () => boolean;
}
export interface PetWindowManager {
  alignWindowToCharacterAnchor: (anchor: Electron.Point) => void;
  create: () => void;
  dispose: () => void;
  getCharacterScreenAnchor: () => Electron.Point;
  recordPosition: () => Promise<void>;
  restorePosition: () => void;
  send: (channel: string, ...args: unknown[]) => void;
  setAlwaysOnTop: (enabled: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  show: () => void;
  showSettings: () => void;
}
// 定义常显桌宠拖拽按钮的交互区域尺寸。
const PET_DRAG_HANDLE_SIZE = 36;
// 限制桌宠支持的最小人物宽度。
const PET_SIZE_MIN = 50;
// 限制桌宠支持的最大人物宽度。
const PET_SIZE_MAX = 400;
// 固定画布在气泡所在侧容纳一份最大气泡，人物贴向另一侧，切换气泡方位只需重新摆放窗口。
const PET_WINDOW_SIZE = {
  width:
    PET_WINDOW_PADDING * 2 +
    PET_BUBBLE_GAP +
    PET_BUBBLE_MAX_SIZE.width +
    PET_SIZE_MAX,
  // 高度保证气泡上下对齐且桌宠最小时仍完整可见。
  height: (PET_WINDOW_PADDING + PET_BUBBLE_MAX_SIZE.height) * 2 - PET_SIZE_MIN,
};
// 定义桌宠窗口淡入动画的持续时间。
const PET_FADE_DURATION_MS = 180;
// 创建桌宠窗口及其布局、位置与交互控制器。
export function createPetWindowManager(
  dependencies: PetWindowManagerDependencies,
): PetWindowManager {
  // 保存当前桌宠浏览器窗口实例。
  let petWindow: BrowserWindow | null = null;
  // 保存桌宠淡入动画的定时任务。
  let fadeTimer: NodeJS.Timeout | undefined;
  // 标识业务气泡当前是否展开。
  let isExpanded = false;
  // 标识透明窗口当前是否启用鼠标穿透。
  let isMouseThrough = false;
  // 标识桌宠窗口当前是否正在由用户拖动。
  let isDragging = false;
  // 保存渲染进程上报的气泡联合边界。
  let bubbleBounds: Electron.Rectangle | null = null;
  // 保存本次拖动开始时的窗口位置。
  let dragStartPosition: Electron.Point | null = null;
  // 保存上次原生拖动位置，用相邻位移识别中途转向。
  let lastDragPosition: Electron.Point | null = null;
  // 缓存当前图片与桌宠宽度对应的人物尺寸。
  let characterSizeCache: {
    imagePath: string;
    width: number;
    size: Electron.Size;
  } | null = null;
  // 缓存 Chromium 实际解码得到的图片原始尺寸。
  let imageNaturalSize: {
    imagePath: string;
    width: number;
    height: number;
  } | null = null;
  // 判断本次启动是否应立即显示桌宠窗口。
  function shouldShowOnLaunch(): boolean {
    if (process.argv.includes('--background')) return false;
    return (
      process.platform !== 'darwin' ||
      !app.getLoginItemSettings().wasOpenedAtLogin
    );
  }
  // 根据开发或生产环境加载桌宠渲染页面。
  async function loadView(window: BrowserWindow): Promise<void> {
    if (process.env.VITE_DEV_SERVER_URL) {
      await window.loadURL(process.env.VITE_DEV_SERVER_URL);
      return;
    }
    await window.loadFile(
      join(dependencies.runtimeDirectory, '../dist-renderer/index.html'),
    );
  }
  // 将桌宠窗口平滑过渡到目标透明度。
  function animateOpacity(targetOpacity: number): void {
    // 固定动画开始时操作的窗口实例。
    const window = petWindow;
    if (!window || window.isDestroyed()) return;
    clearInterval(fadeTimer);
    // 记录淡入动画开始时的窗口透明度。
    const startOpacity = window.getOpacity();
    // 记录淡入动画开始时间。
    const startedAt = Date.now();
    // 按固定帧间隔更新窗口透明度。
    fadeTimer = setInterval(() => {
      if (window.isDestroyed() || petWindow !== window) {
        clearInterval(fadeTimer);
        fadeTimer = undefined;
        return;
      }
      // 计算淡入动画的线性完成比例。
      const progress = Math.min(
        1,
        (Date.now() - startedAt) / PET_FADE_DURATION_MS,
      );
      // 使用缓出曲线生成自然的透明度进度。
      const easedProgress = 1 - (1 - progress) ** 3;
      window.setOpacity(
        startOpacity + (targetOpacity - startOpacity) * easedProgress,
      );
      if (progress < 1) return;
      clearInterval(fadeTimer);
      fadeTimer = undefined;
    }, 16);
  }
  // 显示桌宠窗口并执行淡入动画。
  function show(): void {
    if (!petWindow) return;
    if (!petWindow.isVisible()) {
      petWindow.setOpacity(0);
      petWindow.showInactive();
    }
    animateOpacity(1);
  }
  // 解析当前桌宠图片对应的实际人物尺寸。
  function getCharacterSize(): Electron.Size {
    // 将用户设置的桌宠宽度限制在支持范围内。
    const width = clamp(
      Math.round(dependencies.getSettings().petSize),
      PET_SIZE_MIN,
      PET_SIZE_MAX,
    );
    // 读取当前生效桌宠图片路径。
    const imagePath = dependencies.getActiveImagePath();
    if (
      characterSizeCache?.imagePath === imagePath &&
      characterSizeCache.width === width
    )
      return characterSizeCache.size;
    // 图片或桌宠尺寸未变化时复用计算结果，避免命中检测反复读取和解码资源。
    // 尝试使用 Electron 原生图片能力解析尺寸。
    const activeImage = nativeImage.createFromPath(imagePath);
    // 优先使用 Chromium 上报尺寸，其次使用原生解码或默认比例。
    const imageSize =
      imageNaturalSize?.imagePath === imagePath
        ? imageNaturalSize
        : !activeImage.isEmpty()
          ? activeImage.getSize()
          : { width: 594, height: 840 };
    // 根据目标宽度与图片比例计算人物展示尺寸。
    const size = {
      width,
      height: Math.round((width * imageSize.height) / imageSize.width),
    };
    characterSizeCache = { imagePath, width, size };
    return size;
  }
  // 返回桌宠窗口当前内容区域尺寸。
  function getWindowSize(): Electron.Size {
    if (!petWindow) return PET_WINDOW_SIZE;
    // 读取窗口实际内容边界以兼容系统缩放差异。
    const bounds = petWindow.getContentBounds();
    return { width: bounds.width, height: bounds.height };
  }
  // 计算桌宠在固定内容区内的边界：纵向居中，横向贴向气泡反方向的一侧。
  function calculateLocalCharacterBounds(
    windowSize: Electron.Size,
    characterSize: Electron.Size,
  ): Electron.Rectangle {
    // 读取气泡相对人物的方位设置。
    const { bubbleDirection } = dependencies.getSettings();
    return {
      x:
        bubbleDirection === 'right'
          ? PET_WINDOW_PADDING
          : windowSize.width - PET_WINDOW_PADDING - characterSize.width,
      y: Math.round((windowSize.height - characterSize.height) / 2),
      ...characterSize,
    };
  }
  // 返回当前人物在窗口内容区域中的边界。
  function getLocalCharacterBounds(): Electron.Rectangle {
    return calculateLocalCharacterBounds(getWindowSize(), getCharacterSize());
  }
  // 返回人物右上角对应的位置记录锚点，锚点跟随人物自身，与气泡方位和画布布局无关。
  function getPositionAnchor(
    characterBounds: Electron.Rectangle,
  ): Electron.Point {
    return {
      x: characterBounds.x + characterBounds.width,
      y: characterBounds.y,
    };
  }
  // 读取人物当前在屏幕坐标系中的位置锚点。
  function getCharacterScreenAnchor(): Electron.Point {
    // 窗口尚未创建时以原点作为兜底锚点。
    if (!petWindow || petWindow.isDestroyed()) return { x: 0, y: 0 };
    // 读取窗口在屏幕坐标系中的边界。
    const windowBounds = petWindow.getBounds();
    // 将人物局部锚点换算为屏幕坐标。
    const localAnchor = getPositionAnchor(getLocalCharacterBounds());
    return {
      x: windowBounds.x + localAnchor.x,
      y: windowBounds.y + localAnchor.y,
    };
  }
  // 按人物屏幕锚点重新摆放窗口，使尺寸或气泡方位变化后人物在屏幕上保持原位。
  function alignWindowToCharacterAnchor(anchor: Electron.Point): void {
    if (!petWindow || petWindow.isDestroyed() || isDragging) return;
    // 读取当前布局下人物锚点在窗口内容区域中的位置。
    const localAnchor = getPositionAnchor(getLocalCharacterBounds());
    petWindow.setPosition(anchor.x - localAnchor.x, anchor.y - localAnchor.y);
  }
  // 返回拖拽按钮在窗口内容区域中的交互边界，按钮随气泡方位镜像到人物另一侧。
  function getLocalDragHandleBounds(): Electron.Rectangle {
    // 读取人物在固定窗口中的局部边界。
    const character = getLocalCharacterBounds();
    // 读取气泡相对人物的方位设置。
    const { bubbleDirection } = dependencies.getSettings();
    // 气泡位于人物右侧时按钮镜像到人物左上角，避免按钮与气泡相互遮挡。
    const handleCenterX =
      bubbleDirection === 'right' ? character.x : character.x + character.width;
    return {
      x: handleCenterX - PET_DRAG_HANDLE_SIZE / 2,
      y: character.y - PET_DRAG_HANDLE_SIZE / 2,
      width: PET_DRAG_HANDLE_SIZE,
      height: PET_DRAG_HANDLE_SIZE,
    };
  }
  // 根据持久化锚点比例恢复窗口在目标显示器中的位置。
  function getRestoredPosition(
    characterSize: Electron.Size,
    windowSize: Electron.Size,
  ): Electron.Point {
    // 读取桌宠显示器与相对位置设置。
    const settings = dependencies.getSettings();
    // 读取系统当前可用的全部显示器。
    const displays = screen.getAllDisplays();
    // 查找上次保存位置所属的显示器。
    const savedDisplay = displays.find(
      (display) => display.id === settings.petDisplayId,
    );
    // 选择已保存显示器或主显示器作为恢复目标。
    const display = savedDisplay ?? screen.getPrimaryDisplay();
    // 提取目标显示器不含任务栏的工作区域。
    const { workArea } = display;
    // 标识设置中是否包含完整有效的相对位置。
    const hasSavedPosition =
      Number.isFinite(settings.petPositionX) &&
      Number.isFinite(settings.petPositionY);
    // 计算人物在固定窗口中的局部边界。
    const localCharacterBounds = calculateLocalCharacterBounds(
      windowSize,
      characterSize,
    );
    // 计算位置锚点相对窗口内容区域的位置。
    const localAnchor = getPositionAnchor(localCharacterBounds);
    // 初始化锚点横坐标为目标显示器中的默认位置。
    let anchorX = Math.round(
      workArea.x + (workArea.width + characterSize.width) / 2,
    );
    // 初始化锚点纵坐标为目标显示器垂直居中位置。
    let anchorY = Math.round(
      workArea.y + (workArea.height - characterSize.height) / 2,
    );
    if (hasSavedPosition) {
      // 将持久化横向比例限制在显示器范围内。
      const relativeX = clamp(settings.petPositionX as number, 0, 1);
      // 将持久化纵向比例限制在显示器范围内。
      const relativeY = clamp(settings.petPositionY as number, 0, 1);
      anchorX = Math.round(workArea.x + relativeX * workArea.width);
      anchorY = Math.round(workArea.y + relativeY * workArea.height);
    }
    // 位置锚点位于人物矩形右上角，允许人物底部超出工作区以保留用户的拖拽位置。
    anchorX = clamp(
      anchorX,
      workArea.x + Math.min(characterSize.width, workArea.width),
      workArea.x + workArea.width,
    );
    anchorY = clamp(anchorY, workArea.y, workArea.y + workArea.height);
    return {
      x: anchorX - localAnchor.x,
      y: anchorY - localAnchor.y,
    };
  }
  // 将当前桌宠位置锚点持久化为显示器相对位置。
  async function recordPosition(): Promise<void> {
    if (!petWindow || petWindow.isDestroyed() || isDragging) return;
    // 读取当前窗口在屏幕坐标系中的边界。
    const windowBounds = petWindow.getBounds();
    // 读取位置锚点在窗口内容区域中的位置。
    const localAnchor = getPositionAnchor(getLocalCharacterBounds());
    // 将位置锚点转换为屏幕坐标。
    const anchor = {
      x: windowBounds.x + localAnchor.x,
      y: windowBounds.y + localAnchor.y,
    };
    // 查找当前锚点所在或最近的显示器。
    const display = screen.getDisplayNearestPoint(anchor);
    await dependencies.updateSettings({
      petDisplayId: display.id,
      petPositionX: clamp(
        (anchor.x - display.workArea.x) / display.workArea.width,
        0,
        1,
      ),
      petPositionY: clamp(
        (anchor.y - display.workArea.y) / display.workArea.height,
        0,
        1,
      ),
    });
  }
  // 按持久化设置重新定位当前桌宠窗口。
  function restorePosition(): void {
    if (!petWindow || petWindow.isDestroyed()) return;
    // 读取当前桌宠窗口实际尺寸。
    const [width, height] = petWindow.getSize();
    // 计算当前显示器环境下应恢复的窗口位置。
    const position = getRestoredPosition(getCharacterSize(), { width, height });
    petWindow.setPosition(position.x, position.y);
  }
  // 按气泡对齐方式计算气泡相对人物的纵向起点。
  function getAlignedBubbleTop(character: Electron.Rectangle): number {
    // 读取气泡对齐方式设置。
    const { bubbleAlign } = dependencies.getSettings();
    if (bubbleAlign === 'top') return character.y;
    if (bubbleAlign === 'bottom')
      return character.y + character.height - PET_BUBBLE_MAX_SIZE.height;
    return Math.round(
      character.y + (character.height - PET_BUBBLE_MAX_SIZE.height) / 2,
    );
  }
  // 估算气泡首次渲染前的默认交互边界。
  function getLocalBubbleBounds(): Electron.Rectangle {
    // 读取人物在固定窗口中的局部边界。
    const character = getLocalCharacterBounds();
    // 读取气泡相对人物的方位设置。
    const { bubbleDirection } = dependencies.getSettings();
    return {
      x:
        bubbleDirection === 'right'
          ? character.x + character.width + PET_BUBBLE_GAP
          : character.x - PET_BUBBLE_GAP - PET_BUBBLE_MAX_SIZE.width,
      y: getAlignedBubbleTop(character),
      ...PET_BUBBLE_MAX_SIZE,
    };
  }
  // 根据指针位置切换透明区域的鼠标穿透状态。
  function updateMouseThrough(pointer?: Electron.Point): void {
    if (
      !petWindow ||
      petWindow.isDestroyed() ||
      !petWindow.isVisible() ||
      isDragging
    )
      return;
    // 优先使用渲染进程上报的窗口内指针坐标。
    let localCursor = pointer;
    if (!localCursor) {
      // 读取窗口屏幕边界供系统鼠标坐标换算使用。
      const windowBounds = petWindow.getBounds();
      // 读取系统当前鼠标屏幕坐标。
      const cursor = screen.getCursorScreenPoint();
      localCursor = {
        x: cursor.x - windowBounds.x,
        y: cursor.y - windowBounds.y,
      };
    }
    // 选择渲染进程实测或主进程预估的气泡边界。
    const interactiveBubbleBounds = bubbleBounds ?? getLocalBubbleBounds();
    // 标识指针是否命中人物、拖拽按钮或展开气泡。
    const isInteractive =
      containsPoint(
        expandRectangle(getLocalCharacterBounds(), 10),
        localCursor,
      ) ||
      containsPoint(
        expandRectangle(getLocalDragHandleBounds(), 4),
        localCursor,
      ) ||
      (isExpanded &&
        containsPoint(
          expandRectangle(interactiveBubbleBounds, 6),
          localCursor,
        ));
    if (isMouseThrough === !isInteractive) return;
    isMouseThrough = !isInteractive;
    // 透明区域点击穿透，forward 保留鼠标移动以便重新进入人物时恢复交互。
    petWindow.setIgnoreMouseEvents(isMouseThrough, { forward: true });
  }
  // 同步气泡展开状态并刷新透明区域穿透状态。
  function setExpanded(expanded: boolean): void {
    isExpanded = expanded;
    if (!expanded) bubbleBounds = null;
    updateMouseThrough();
  }
  // 窗口开始移动时进入拖拽状态并关闭鼠标穿透。
  function handleWindowWillMove(
    _event: Electron.Event,
    bounds: Electron.Rectangle,
  ): void {
    if (!petWindow || petWindow.isDestroyed()) return;
    if (!isDragging) {
      // 只在起点读取窗口位置并关闭穿透，避免每次移动重复调用原生接口。
      const [x, y] = petWindow.getPosition();
      dragStartPosition = { x, y };
      lastDragPosition = { x, y };
      isDragging = true;
      isMouseThrough = false;
      petWindow.setIgnoreMouseEvents(false);
    }
    // 原生拖动区不会触发 DOM 指针事件，由主进程发送真实移动方向。
    const previous = lastDragPosition;
    if (!previous) return;
    if (Math.hypot(bounds.x - previous.x, bounds.y - previous.y) >= 2) {
      send('pet:motion', {
        x: bounds.x - previous.x,
        y: bounds.y - previous.y,
      });
      lastDragPosition = { x: bounds.x, y: bounds.y };
    }
  }
  // 窗口移动结束后恢复交互并持久化变化位置。
  function handleWindowMoved(): void {
    if (!petWindow || petWindow.isDestroyed() || !dragStartPosition) return;
    // 读取拖动结束后的窗口位置。
    const [x, y] = petWindow.getPosition();
    // 标识窗口是否真正离开了拖动起点。
    const hasMoved = dragStartPosition.x !== x || dragStartPosition.y !== y;
    dragStartPosition = null;
    lastDragPosition = null;
    send('pet:motion', null);
    isDragging = false;
    updateMouseThrough();
    if (!hasMoved) return;
    // 异步保存位置并记录持久化失败。
    recordPosition().catch((error: unknown) => {
      console.error('保存桌宠位置失败', error);
    });
  }
  // 创建并配置桌宠透明浏览器窗口。
  function create(): void {
    // 读取窗口置顶与桌宠外观设置。
    const settings = dependencies.getSettings();
    // 计算当前桌宠人物实际尺寸。
    const characterSize = getCharacterSize();
    // 根据保存的位置锚点反算固定窗口的初始位置。
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
    // 系统会把初始窗口限制在显示器工作区内，创建后显式恢复固定画布尺寸以保证人物与气泡布局完整。
    petWindow.setContentSize(PET_WINDOW_SIZE.width, PET_WINDOW_SIZE.height);
    // 读取窗口创建后由系统确认的实际尺寸。
    const actualWindowSize = petWindow.getSize();
    // 根据实际窗口尺寸重新校准恢复位置。
    const actualPosition = getRestoredPosition(characterSize, {
      width: actualWindowSize[0],
      height: actualWindowSize[1],
    });
    petWindow.setPosition(actualPosition.x, actualPosition.y);
    petWindow.on('will-move', handleWindowWillMove);
    petWindow.on('moved', handleWindowMoved);
    // 页面加载完成后再次确保透明背景生效。
    petWindow.webContents.once('did-finish-load', () =>
      petWindow?.setBackgroundColor('#00000000'),
    );
    loadView(petWindow);
    // 非应用退出流程关闭窗口时保持桌宠运行。
    petWindow.on('close', (event) => {
      if (!dependencies.isQuitting()) event.preventDefault();
    });
    // 窗口销毁后清理定时器与拖拽状态。
    petWindow.on('closed', () => {
      clearInterval(fadeTimer);
      fadeTimer = undefined;
      dragStartPosition = null;
      petWindow = null;
    });
  }
  // 显示桌宠并在页面就绪后打开设置气泡。
  function showSettings(): void {
    show();
    if (!petWindow) return;
    if (petWindow.webContents.isLoading()) {
      // 等待页面首次加载完成后再发送设置打开事件。
      petWindow.webContents.once('did-finish-load', () =>
        petWindow?.webContents.send('pet:open-settings'),
      );
      return;
    }
    petWindow.webContents.send('pet:open-settings');
  }
  // 向桌宠渲染进程发送指定频道消息。
  function send(channel: string, ...args: unknown[]): void {
    petWindow?.webContents.send(channel, ...args);
  }
  // 更新桌宠窗口的系统置顶状态。
  function setAlwaysOnTop(enabled: boolean): void {
    petWindow?.setAlwaysOnTop(enabled);
  }
  // 接收渲染进程上报的气泡展开状态。
  ipcMain.on('pet:expanded', (event, expanded: boolean) => {
    if (!petWindow || event.sender !== petWindow.webContents) return;
    setExpanded(Boolean(expanded));
  });
  // 接收并校验渲染进程上报的气泡联合边界。
  ipcMain.on('pet:bubble-bounds', (_event, bounds: unknown) => {
    if (bounds === null) {
      bubbleBounds = null;
      updateMouseThrough();
      return;
    }
    if (!bounds || typeof bounds !== 'object') return;
    // 将未知边界收窄为待校验矩形结构。
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
  // 接收并校验渲染进程上报的窗口内指针位置。
  ipcMain.on('pet:pointer-move', (event, pointer: unknown) => {
    if (
      !petWindow ||
      event.sender !== petWindow.webContents ||
      !pointer ||
      typeof pointer !== 'object'
    )
      return;
    // 将未知指针数据收窄为待校验坐标结构。
    const candidate = pointer as Partial<Electron.Point>;
    if (![candidate.x, candidate.y].every(Number.isFinite)) return;
    updateMouseThrough({
      x: candidate.x as number,
      y: candidate.y as number,
    });
  });
  // 接收并校验 Chromium 实际解码的桌宠图片尺寸。
  ipcMain.on('pet:image-size', (event, size: unknown) => {
    if (
      !petWindow ||
      event.sender !== petWindow.webContents ||
      !size ||
      typeof size !== 'object'
    )
      return;
    // 将未知图片尺寸收窄为待校验结构。
    const candidate = size as Partial<Electron.Size>;
    if (![candidate.width, candidate.height].every(Number.isFinite)) return;
    // 规范化图片实际宽度为整数。
    const width = Math.round(candidate.width as number);
    // 规范化图片实际高度为整数。
    const height = Math.round(candidate.height as number);
    if (width <= 0 || height <= 0) return;
    // 保存形象尺寸变化前人物的屏幕位置，校准后据此保持人物不动。
    const characterAnchor = getCharacterScreenAnchor();
    // 动态 WebP 无法由 nativeImage 解码，使用 Chromium 实际渲染尺寸校准点击热区。
    imageNaturalSize = {
      imagePath: dependencies.getActiveImagePath(),
      width,
      height,
    };
    characterSizeCache = null;
    alignWindowToCharacterAnchor(characterAnchor);
    updateMouseThrough();
    // 图片比例变化后重新保存校准过的桌宠位置。
    recordPosition().catch((error: unknown) => {
      console.error('保存桌宠尺寸变化后的位置失败', error);
    });
  });
  return {
    alignWindowToCharacterAnchor,
    create,
    // 销毁管理器时停止尚未完成的淡入动画。
    dispose: () => clearInterval(fadeTimer),
    getCharacterScreenAnchor,
    recordPosition,
    restorePosition,
    send,
    setAlwaysOnTop,
    setExpanded,
    show,
    showSettings,
  };
}
