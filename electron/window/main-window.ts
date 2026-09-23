import { BrowserWindow } from 'electron';
import { join } from 'node:path';
interface MainWindowDependencies {
  runtimeDirectory: string;
}
interface MainWindowOptions {
  visible?: boolean;
}
export interface MainWindowManager {
  create: (options?: MainWindowOptions) => void;
  dispose: () => void;
  send: (channel: string, ...args: unknown[]) => void;
  setAlwaysOnTop: (enabled: boolean) => void;
  show: () => void;
}
// 定义主窗口创建时使用的默认宽度。
const DEFAULT_WINDOW_WIDTH = 1180;
// 定义主窗口创建时使用的默认高度。
const DEFAULT_WINDOW_HEIGHT = 800;
// 限制主窗口允许的最小宽度。
const MIN_WINDOW_WIDTH = 960;
// 限制主窗口允许的最小高度。
const MIN_WINDOW_HEIGHT = 640;
// 创建标准桌面主窗口，并维护窗口生命周期与主进程事件转发。
export function createMainWindowManager(
  dependencies: MainWindowDependencies,
): MainWindowManager {
  // 保存当前主窗口实例。
  let mainWindow: BrowserWindow | null = null;
  // 标识渲染页面是否已完成首帧绘制。
  let isViewReady = false;
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
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT,
      show: false,
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
  // 应用退出前释放窗口资源。
  function dispose(): void {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.destroy();
    mainWindow = null;
  }
  return { create, dispose, send, setAlwaysOnTop, show };
}
