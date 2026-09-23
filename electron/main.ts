import { app, BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLoginSetting,
  getExecutablePath,
  getWindowsIconPath,
  parseInstallerConfiguration,
} from './app';
import {
  installContextMenu,
  isContextMenuInstalled,
  removeContextMenu,
  updateContextMenuIcon,
} from './integrations';
import { registerIpcHandlers } from './ipc';
import {
  createShredSession,
  getShredTargetMetadata,
  normalizeTargets,
} from './shred';
import { AppSettings, AppStore } from './storage';
import { createMainWindowManager } from './window';
// 创建应用级设置与记录存储实例。
const store = new AppStore(app);
// 解析构建后主进程模块所在目录。
const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
// 缓存当前生效的应用设置。
let currentSettings: AppSettings;
// 保存合并外部启动路径的延迟任务。
let launchTimer: NodeJS.Timeout | undefined;
// 保存启动后维护任务的延迟定时器。
let startupMaintenanceTimer: NodeJS.Timeout | undefined;
// 汇总等待渲染进程确认的外部启动路径。
let queuedLaunchPaths: string[] = [];
// 创建主窗口管理器，负责窗口生命周期与事件转发。
const mainWindowManager = createMainWindowManager({ runtimeDirectory });
// 创建应用级粉碎任务会话。
const shredSession = createShredSession({
  store,
  windowManager: mainWindowManager,
  // 向粉碎会话提供当前应用设置。
  getSettings: () => currentSettings,
});
// vite-plugin-electron 在主进程热更新后复用窗口，只刷新渲染内容。
if (process.env.VITE_DEV_SERVER_URL) {
  // 接收开发服务器主进程热更新消息。
  process.on('message', (message) => {
    if (message !== 'electron-vite&type=hot-reload') return;
    // 刷新全部现有窗口的渲染内容。
    BrowserWindow.getAllWindows().forEach((window) =>
      window.webContents.reload(),
    );
  });
}
// 从进程参数中提取存在的外部粉碎目标路径。
function parseLaunchPaths(argv: string[]): string[] {
  // 查找外部粉碎参数在启动命令中的位置。
  const marker = argv.indexOf('--shred');
  if (marker < 0) return [];
  // 解析标记后的路径并过滤不存在的目标。
  return argv
    .slice(marker + 1)
    .map((item) => resolve(item))
    .filter(existsSync);
}
// 将安装器选择的系统设置写入本地设置，并同步对应系统集成。
async function applyInstallerConfiguration(
  configuration: Partial<AppSettings>,
): Promise<void> {
  // 仅在首次安装时采用安装器提供的默认值，升级安装保留用户已有设置。
  currentSettings = (await store.hasStoredSettings())
    ? await store.getSettings()
    : await store.updateSettings(configuration);
  // 即使设置已关闭也同步一次，以清理由旧版本遗留的错误启动项。
  applyLoginSetting(currentSettings.launchAtLogin);
  if (process.platform !== 'win32') return;
  if (currentSettings.contextMenuInstalled)
    await installContextMenu(getExecutablePath(), getWindowsIconPath());
  else await removeContextMenu();
}
// 处理安装器命令行请求，返回本次启动是否属于安装阶段。
async function applyInstallerRequest(argv: string[]): Promise<boolean> {
  const configuration = parseInstallerConfiguration(argv);
  if (!configuration) return false;
  await applyInstallerConfiguration(configuration);
  return true;
}
// 校验外部目标，并请求渲染进程展示粉碎确认页面。
async function requestShredConfirmation(paths: string[]): Promise<void> {
  // 规范化并过滤外部传入的粉碎路径。
  const normalizedPaths = await normalizeTargets(paths);
  if (normalizedPaths.length === 0) return;
  // 读取确认页面展示所需的目标元数据。
  const targets = await getShredTargetMetadata(normalizedPaths);
  mainWindowManager.show();
  mainWindowManager.send('task:confirm', targets, currentSettings.passes);
}
// 合并短时间内收到的外部启动路径并延迟确认。
function queueLaunchPaths(paths: string[]): void {
  queuedLaunchPaths = [...new Set([...queuedLaunchPaths, ...paths])];
  clearTimeout(launchTimer);
  // 延迟处理外部路径以合并系统连续启动事件。
  launchTimer = setTimeout(async () => {
    // 固定本轮需要请求确认的路径集合。
    const targets = queuedLaunchPaths;
    queuedLaunchPaths = [];
    await requestShredConfirmation(targets);
  }, 260);
}
// 安装或删除系统右键菜单并同步设置状态。
async function setContextMenuEnabled(enabled: boolean): Promise<void> {
  // 保存本次右键菜单系统操作结果。
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
  mainWindowManager.send('settings:changed');
}
// 处理第二实例传入的安装器请求、粉碎目标或显示请求。
async function handleSecondInstance(argv: string[]): Promise<void> {
  // 应用已在运行时由当前实例代为处理安装器下发的初始设置。
  if (await applyInstallerRequest(argv)) return;
  // 提取第二实例命令中的有效粉碎目标。
  const launchPaths = parseLaunchPaths(argv);
  if (launchPaths.length > 0) {
    queueLaunchPaths(launchPaths);
    return;
  }
  if (argv.includes('--background')) return;
  mainWindowManager.show();
}
// 在应用启动后校准系统集成状态与旧版本遗留配置。
async function runStartupMaintenance(): Promise<void> {
  // 即使设置已关闭也执行一次，以清理由旧版本遗留的错误启动项。
  applyLoginSetting(currentSettings.launchAtLogin);
  if (process.platform !== 'win32') return;
  await updateContextMenuIcon(getWindowsIconPath());
  // 查询系统中实际存在的右键菜单状态。
  const contextMenuInstalled =
    await isContextMenuInstalled(getExecutablePath());
  if (contextMenuInstalled)
    await installContextMenu(getExecutablePath(), getWindowsIconPath());
  currentSettings = await store.updateSettings({
    contextMenuInstalled,
    contextMenuAutoInstall: false,
  });
}
// 延迟执行不阻塞首屏的启动维护任务。
function scheduleStartupMaintenance(): void {
  // 启动一秒后执行系统集成维护。
  startupMaintenanceTimer = setTimeout(() => {
    // 执行维护并记录不影响主流程的失败。
    runStartupMaintenance().catch((error: unknown) => {
      console.error('Startup maintenance failed:', error);
    });
  }, 1000);
}
// 加载设置、创建主窗口并注册应用启动流程。
async function initializeApplication(): Promise<void> {
  // 安装阶段只写入初始设置并同步系统集成，不创建主窗口。
  if (await applyInstallerRequest(process.argv)) {
    app.quit();
    return;
  }
  currentSettings = await store.getSettings();
  // 登录启动或后台启动时保持窗口隐藏，避免开机弹出界面。
  mainWindowManager.create({
    visible: !process.argv.includes('--background'),
  });
  mainWindowManager.setAlwaysOnTop(currentSettings.alwaysOnTop);
  queueLaunchPaths(parseLaunchPaths(process.argv));
  scheduleStartupMaintenance();
}
// 获取应用单实例锁，防止重复启动产生多个主窗口。
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  // 将第二实例启动参数转交给当前主实例。
  app.on('second-instance', (_event, argv) => {
    // 第二实例请求处理失败只记录日志，不影响正在运行的主窗口。
    handleSecondInstance(argv).catch((error: unknown) => {
      console.error('第二实例请求处理失败:', error);
    });
  });
  // Electron 就绪后初始化完整应用。
  app.once('ready', () => {
    // 初始化失败时记录错误并结束应用。
    initializeApplication().catch((error: unknown) => {
      console.error('应用启动失败:', error);
      app.quit();
    });
  });
}
registerIpcHandlers({
  store,
  shredSession,
  windowManager: mainWindowManager,
  // 向 IPC 处理器提供当前设置。
  getSettings: () => currentSettings,
  // 将 IPC 保存后的设置同步到主进程缓存。
  setSettings: (settings) => {
    currentSettings = settings;
  },
  setContextMenuEnabled,
});
// 关闭全部主窗口后按平台约定结束应用。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
// macOS 应用保留在后台时按需重建主窗口。
app.on('activate', () => mainWindowManager.create());
// 应用退出前清理定时器与窗口资源。
app.on('will-quit', () => {
  clearTimeout(launchTimer);
  clearTimeout(startupMaintenanceTimer);
  mainWindowManager.dispose();
});
