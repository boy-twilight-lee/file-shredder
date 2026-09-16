import { app, BrowserWindow, screen } from 'electron';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLoginSetting,
  getExecutablePath,
  getWindowsIconPath,
} from './app';
import {
  installContextMenu,
  isContextMenuInstalled,
  removeContextMenu,
  updateContextMenuIcon,
} from './integrations';
import { registerIpcHandlers } from './ipc';
import { createPetWindowManager, PetImageService } from './pet';
import {
  createShredSession,
  getShredTargetMetadata,
  normalizeTargets,
} from './shred';
import { AppSettings, AppStore } from './storage';
// 创建应用级设置与记录存储实例。
const store = new AppStore(app);
// 解析构建后主进程模块所在目录。
const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
// 缓存当前生效的应用设置。
let currentSettings: AppSettings;
// 标识应用是否正在执行正常退出流程。
let isQuitting = false;
// 保存合并外部启动路径的延迟任务。
let launchTimer: NodeJS.Timeout | undefined;
// 保存启动后维护任务的延迟定时器。
let startupMaintenanceTimer: NodeJS.Timeout | undefined;
// 汇总等待桌宠确认的外部启动路径。
let queuedLaunchPaths: string[] = [];
// 标识应用就绪后是否需要补充显示桌宠。
let shouldShowPetOnReady = false;
// 保存桌宠形象服务实例供窗口管理器回调使用。
let petImageService: PetImageService;
// 创建桌宠窗口及其设置同步依赖。
const petWindowManager = createPetWindowManager({
  runtimeDirectory,
  // 向窗口管理器提供当前应用设置。
  getSettings: () => currentSettings,
  // 持久化窗口管理器产生的设置更新。
  updateSettings: async (patch) => {
    currentSettings = await store.updateSettings(patch);
    return currentSettings;
  },
  // 向窗口管理器提供当前桌宠形象路径。
  getActiveImagePath: () => petImageService.getActiveImagePath(),
  // 向窗口管理器提供应用退出状态。
  isQuitting: () => isQuitting,
});
petImageService = new PetImageService(store, {
  // 向形象服务提供当前应用设置。
  getSettings: () => currentSettings,
  // 将形象服务保存后的设置同步到主进程缓存。
  onSettingsUpdated: (settings) => {
    currentSettings = settings;
  },
  // 形象变化后通知渲染进程刷新桌宠外观。
  notifyAppearanceChanged: () => petWindowManager.send('settings:changed'),
  // 原生选择器关闭后恢复设置气泡。
  restoreSettingsBubble: () => petWindowManager.send('pet:open-settings'),
});
// 创建应用级粉碎任务会话。
const shredSession = createShredSession({
  store,
  windowManager: petWindowManager,
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
// 校验外部目标并请求桌宠展示确认页面。
async function requestPetConfirmation(paths: string[]): Promise<void> {
  // 规范化并过滤外部传入的粉碎路径。
  const normalizedPaths = await normalizeTargets(paths);
  if (normalizedPaths.length === 0) return;
  // 读取确认页面展示所需的目标元数据。
  const targets = await getShredTargetMetadata(normalizedPaths);
  petWindowManager.show();
  petWindowManager.send('pet:confirm', targets, currentSettings.passes);
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
    await requestPetConfirmation(targets);
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
  petWindowManager.send('settings:changed');
}
// 处理第二实例传入的粉碎目标或显示请求。
function handleSecondInstance(argv: string[]): void {
  // 提取第二实例命令中的有效粉碎目标。
  const launchPaths = parseLaunchPaths(argv);
  if (launchPaths.length > 0) {
    queueLaunchPaths(launchPaths);
    return;
  }
  if (argv.includes('--background')) return;
  if (!currentSettings) {
    shouldShowPetOnReady = true;
    return;
  }
  petWindowManager.show();
}
// 在应用启动后迁移旧数据并校准系统集成状态。
async function runStartupMaintenance(): Promise<void> {
  // 即使设置已关闭也执行一次，以清理由旧版本遗留的错误启动项。
  applyLoginSetting(currentSettings.launchAtLogin);
  await petImageService.migrateLegacyImage();
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
// 延迟执行不阻塞桌宠首屏的启动维护任务。
function scheduleStartupMaintenance(): void {
  // 启动一秒后执行系统集成维护。
  startupMaintenanceTimer = setTimeout(() => {
    // 执行维护并记录不影响主流程的失败。
    runStartupMaintenance().catch((error: unknown) => {
      console.error('Startup maintenance failed:', error);
    });
  }, 1000);
}
// 加载设置、创建桌宠窗口并注册屏幕环境监听。
async function initializeApplication(): Promise<void> {
  currentSettings = await store.getSettings();
  petWindowManager.create();
  screen.on('display-removed', petWindowManager.restorePosition);
  screen.on('display-metrics-changed', petWindowManager.restorePosition);
  queueLaunchPaths(parseLaunchPaths(process.argv));
  if (shouldShowPetOnReady) {
    shouldShowPetOnReady = false;
    petWindowManager.show();
  }
  scheduleStartupMaintenance();
}
// 获取应用单实例锁，防止重复桌宠窗口运行。
const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  // 将第二实例启动参数转交给当前主实例。
  app.on('second-instance', (_event, argv) => handleSecondInstance(argv));
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
  petImageService,
  shredSession,
  windowManager: petWindowManager,
  // 向 IPC 处理器提供当前设置。
  getSettings: () => currentSettings,
  // 将 IPC 保存后的设置同步到主进程缓存。
  setSettings: (settings) => {
    currentSettings = settings;
  },
  setContextMenuEnabled,
  // 标记后续窗口关闭属于正常退出流程。
  setQuitting: () => {
    isQuitting = true;
  },
});
// 保持无窗口时主进程继续运行桌宠后台能力。
app.on('window-all-closed', () => undefined);
// 应用退出前清理定时器与窗口资源。
app.on('will-quit', () => {
  clearTimeout(launchTimer);
  clearTimeout(startupMaintenanceTimer);
  petWindowManager.dispose();
});
