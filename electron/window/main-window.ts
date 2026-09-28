import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { BoundsRect, isVisibleInAnyArea } from '../utils';
interface MainWindowDependencies {
  runtimeDirectory: string;
  // 在窗口位置或尺寸稳定后回调，用于持久化最新窗口边界。
  onBoundsChange?: (bounds: BoundsRect) => void;
}
interface MainWindowOptions {
  visible?: boolean;
  // 上次退出时保存的窗口位置与尺寸，未启用记忆时省略。
  bounds?: BoundsRect;
}
// 描述创建主窗口时使用的初始尺寸与可选位置。
interface InitialWindowBounds {
  x?: number;
  y?: number;
  width: number;
  height: number;
}
export interface MainWindowManager {
  create: (options?: MainWindowOptions) => void;
  dispose: () => void;
  send: (channel: string, ...args: unknown[]) => void;
  setAlwaysOnTop: (enabled: boolean) => void;
  show: () => void;
  // 最小化主窗口。
  minimize: () => void;
  // 在主窗口最大化与还原之间切换，并返回切换后的最大化状态。
  toggleMaximize: () => boolean;
  // 关闭主窗口。
  close: () => void;
  // 查询主窗口当前是否处于最大化状态。
  isMaximized: () => boolean;
}
// 定义主窗口创建时使用的默认宽度。
const DEFAULT_WINDOW_WIDTH = 1180;
// 定义主窗口创建时使用的默认高度。
const DEFAULT_WINDOW_HEIGHT = 800;
// 限制主窗口允许的最小宽度。
const MIN_WINDOW_WIDTH = 960;
// 限制主窗口允许的最小高度。
const MIN_WINDOW_HEIGHT = 640;
// 恢复窗口位置时要求与显示器可用区域保持的最小可见重叠尺寸。
const MIN_VISIBLE_BOUNDS = 80;
// 窗口位置与尺寸变化的防抖间隔，避免拖动过程中频繁写入磁盘。
const BOUNDS_PERSIST_DELAY = 400;
// 计算主窗口创建时的初始边界，显示器变化或坐标失效时回退到默认尺寸。
function resolveInitialBounds(bounds?: BoundsRect): InitialWindowBounds {
  if (!bounds)
    return { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT };
  // 收敛宽高到窗口允许的最小尺寸，避免恢复出过小的窗口。
  const width = Math.max(bounds.width, MIN_WINDOW_WIDTH);
  const height = Math.max(bounds.height, MIN_WINDOW_HEIGHT);
  // 读取当前全部显示器的可用区域，用于校验恢复坐标是否仍然可见。
  const workAreas = screen.getAllDisplays().map((display) => display.workArea);
  if (
    !isVisibleInAnyArea(
      { ...bounds, width, height },
      workAreas,
      MIN_VISIBLE_BOUNDS,
    )
  )
    return { width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT };
  return { x: bounds.x, y: bounds.y, width, height };
}
// 创建标准桌面主窗口，并维护窗口生命周期与主进程事件转发。
export function createMainWindowManager(
  dependencies: MainWindowDependencies,
): MainWindowManager {
  // 保存当前主窗口实例。
  let mainWindow: BrowserWindow | null = null;
  // 标识渲染页面是否已完成首帧绘制。
  let isViewReady = false;
  // 保存窗口边界持久化的防抖定时器。
  let boundsPersistTimer: NodeJS.Timeout | undefined;
  // 立即将当前窗口边界交给宿主持久化。
  function persistBounds(): void {
    clearTimeout(boundsPersistTimer);
    if (!dependencies.onBoundsChange) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // 最大化与全屏状态下的边界由系统接管，不参与位置记忆。
    if (mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
    dependencies.onBoundsChange(mainWindow.getBounds());
  }
  // 在窗口位置或尺寸变化后延迟持久化，合并拖动过程中的连续事件。
  function scheduleBoundsPersist(): void {
    clearTimeout(boundsPersistTimer);
    boundsPersistTimer = setTimeout(persistBounds, BOUNDS_PERSIST_DELAY);
  }
  // 按当前运行环境加载渲染进程页面。
  async function loadView(window: BrowserWindow): Promise<void> {
    if (process.env.VITE_DEV_SERVER_URL) {
      await window.loadURL(process.env.VITE_DEV_SERVER_URL);
      return;
    }
    await window.loadFile(
      join(dependencies.runtimeDirectory, '../dist-renderer/index.html'),
    );
  }
  // 显示并聚焦已经就绪的主窗口。
  function show(): void {
    if (!mainWindow || mainWindow.isDestroyed() || !isViewReady) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  // 创建主窗口，并按其初始可见性挂载生命周期监听。
  function create(options: MainWindowOptions = {}): void {
    if (mainWindow && !mainWindow.isDestroyed()) return;
    // 仅当调用方显式关闭可见性时保持窗口隐藏，供后台启动场景使用。
    const isVisibleOnReady = options.visible !== false;
    mainWindow = new BrowserWindow({
      ...resolveInitialBounds(options.bounds),
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT,
      show: false,
      // 使用无边框窗口承载自绘顶部栏与窗口控制按钮。
      frame: false,
      autoHideMenuBar: true,
      backgroundColor: '#f5f7fa',
      webPreferences: {
        preload: join(dependencies.runtimeDirectory, 'preload.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    // Chromium 完成首帧绘制后再显示窗口，避免出现空白窗口。
    mainWindow.once('ready-to-show', () => {
      isViewReady = true;
      if (isVisibleOnReady) show();
    });
    // 最大化状态变化时同步渲染进程，用于切换窗口控制按钮图标。
    mainWindow.on('maximize', () => send('window:maximized', true));
    mainWindow.on('unmaximize', () => send('window:maximized', false));
    // 窗口拖动与缩放结束后持久化最新边界。
    mainWindow.on('resize', scheduleBoundsPersist);
    mainWindow.on('move', scheduleBoundsPersist);
    // 关闭前写入最终边界，避免防抖尚未触发即退出导致位置丢失。
    mainWindow.on('close', persistBounds);
    // 窗口关闭后释放引用，允许应用在 macOS 上重新创建窗口。
    mainWindow.on('closed', () => {
      mainWindow = null;
      isViewReady = false;
    });
    loadView(mainWindow).catch((error: unknown) => {
      console.error('主窗口加载失败:', error);
    });
  }
  // 向主窗口转发主进程事件。
  function send(channel: string, ...args: unknown[]): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send(channel, ...args);
  }
  // 同步主窗口置顶状态。
  function setAlwaysOnTop(enabled: boolean): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setAlwaysOnTop(enabled);
  }
  // 最小化主窗口。
  function minimize(): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.minimize();
  }
  // 在主窗口最大化与还原之间切换。
  function toggleMaximize(): boolean {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  }
  // 关闭主窗口，由应用生命周期决定是否退出进程。
  function close(): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.close();
  }
  // 查询主窗口当前是否处于最大化状态。
  function isMaximized(): boolean {
    return Boolean(
      mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized(),
    );
  }
  // 应用退出前保存窗口边界并释放窗口资源。
  function dispose(): void {
    persistBounds();
    clearTimeout(boundsPersistTimer);
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.destroy();
    mainWindow = null;
  }
  return {
    create,
    dispose,
    send,
    setAlwaysOnTop,
    show,
    minimize,
    toggleMaximize,
    close,
    isMaximized,
  };
}
