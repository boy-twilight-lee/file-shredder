import { app, dialog, ipcMain } from 'electron';
import { applyLoginSetting, getExecutablePath } from '../app';
import { isContextMenuInstalled, removeContextMenu } from '../integrations';
import {
  getShredTargetMetadata,
  normalizeTargets,
  ShredSession,
} from '../shred';
import { AppSettings, AppStore } from '../storage';
import { MainWindowManager } from '../window';
interface IpcHandlerDependencies {
  store: AppStore;
  shredSession: ShredSession;
  windowManager: MainWindowManager;
  getSettings: () => AppSettings;
  setSettings: (settings: AppSettings) => void;
  setContextMenuEnabled: (enabled: boolean) => Promise<void>;
}
// 描述设置字段允许的取值类型，用于过滤渲染进程传入的非法参数。
const SETTING_PATCH_VALIDATORS: Record<
  keyof AppSettings,
  (value: unknown) => boolean
> = {
  passes: (value) => value === 0 || value === 3 || value === 7 || value === 35,
  removeRootDirectory: (value) => typeof value === 'boolean',
  confirmBeforeShred: (value) => typeof value === 'boolean',
  alwaysOnTop: (value) => typeof value === 'boolean',
  launchAtLogin: (value) => typeof value === 'boolean',
  systemNotifications: (value) => typeof value === 'boolean',
  contextMenuInstalled: (value) => typeof value === 'boolean',
  contextMenuAutoInstall: (value) => typeof value === 'boolean',
};
// 过滤渲染进程提交的设置，只保留字段名合法且取值类型正确的部分。
function normalizeSettingsPatch(patch: unknown): Partial<AppSettings> {
  if (typeof patch !== 'object' || patch === null) return {};
  // 汇总通过校验的设置字段。
  const normalized: Partial<AppSettings> = {};
  for (const [key, value] of Object.entries(patch)) {
    // 忽略未登记字段，避免渲染进程写入任意配置。
    const validator = SETTING_PATCH_VALIDATORS[key as keyof AppSettings];
    if (!validator || !validator(value)) continue;
    // 通过校验的字段按原始字段名写回。
    (normalized as Record<string, unknown>)[key] = value;
  }
  return normalized;
}
// 注册渲染进程可调用的全部主进程业务处理器。
export function registerIpcHandlers(
  dependencies: IpcHandlerDependencies,
): void {
  // 打开文件或目录选择器并返回用户选择路径。
  ipcMain.handle(
    'targets:choose',
    async (_event, kind: 'file' | 'directory') => {
      // 根据目标类型生成原生选择器属性。
      const properties: Array<
        'openFile' | 'openDirectory' | 'multiSelections'
      > =
        kind === 'file'
          ? ['openFile', 'multiSelections']
          : ['openDirectory', 'multiSelections'];
      // 保存原生目标选择器返回结果。
      const result = await dialog.showOpenDialog({ properties });
      return result.canceled ? [] : result.filePaths;
    },
  );
  // 校验并读取待粉碎目标元数据。
  ipcMain.handle('shred:prepare', async (_event, paths: unknown) => {
    // 确保渲染进程仅传入字符串路径数组。
    if (
      !Array.isArray(paths) ||
      !paths.every((item) => typeof item === 'string')
    )
      throw new Error('无效的路径参数');
    return getShredTargetMetadata(await normalizeTargets(paths));
  });
  // 校验参数并启动文件粉碎任务。
  ipcMain.handle(
    'shred:start',
    async (_event, paths: unknown, passes: unknown) => {
      // 确保渲染进程仅传入字符串路径数组。
      if (
        !Array.isArray(paths) ||
        !paths.every((item) => typeof item === 'string')
      )
        throw new Error('无效的路径参数');
      if (passes !== 0 && passes !== 3 && passes !== 7 && passes !== 35)
        throw new Error('无效的清除强度');
      return dependencies.shredSession.start(paths, passes);
    },
  );
  // 请求取消当前活动粉碎任务。
  ipcMain.handle('shred:cancel', () => dependencies.shredSession.cancel());
  // 安装资源管理器右键菜单。
  ipcMain.handle('context-menu:install', async () => {
    await dependencies.setContextMenuEnabled(true);
    return true;
  });
  // 删除资源管理器右键菜单。
  ipcMain.handle('context-menu:remove', async () => {
    await dependencies.setContextMenuEnabled(false);
    return true;
  });
  // 查询当前应用右键菜单安装状态。
  ipcMain.handle('context-menu:status', () =>
    isContextMenuInstalled(getExecutablePath()),
  );
  // 返回主进程缓存的当前应用设置。
  ipcMain.handle('settings:get', () => dependencies.getSettings());
  // 校验、持久化设置并同步关联系统能力。
  ipcMain.handle('settings:update', async (_event, patch: unknown) => {
    // 读取更新前设置供差异判断使用。
    const previousSettings = dependencies.getSettings();
    // 过滤渲染进程提交的设置字段与取值。
    const safePatch = normalizeSettingsPatch(patch);
    if (
      typeof safePatch.contextMenuInstalled === 'boolean' &&
      safePatch.contextMenuInstalled !== previousSettings.contextMenuInstalled
    )
      await dependencies.setContextMenuEnabled(
        safePatch.contextMenuInstalled,
      );
    // 保存经过校验的设置更新，并清除安装器痕迹字段。
    const settings = await dependencies.store.updateSettings({
      ...safePatch,
      contextMenuAutoInstall: false,
    });
    dependencies.setSettings(settings);
    dependencies.windowManager.setAlwaysOnTop(settings.alwaysOnTop);
    if (typeof safePatch.launchAtLogin === 'boolean')
      applyLoginSetting(safePatch.launchAtLogin);
    dependencies.windowManager.send('settings:changed');
    return dependencies.getSettings();
  });
  // 返回全部本地粉碎记录。
  ipcMain.handle('logs:get', () => dependencies.store.getLogs());
  // 校验、去重并删除指定粉碎记录。
  ipcMain.handle('logs:delete', (_event, ids: unknown) => {
    // 确保渲染进程仅传入字符串记录标识。
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
      throw new Error('无效的粉碎记录参数');
    return dependencies.store.deleteLogs([...new Set(ids)]);
  });
  // 标记正常退出并结束应用进程。
  ipcMain.handle('app:exit', () => {
    // 当前 IPC 响应完成后退出应用。
    setImmediate(() => app.quit());
    return true;
  });
  // 清理系统集成与本地数据后结束应用进程。
  ipcMain.handle('app:cleanup-exit', async () => {
    await removeContextMenu();
    applyLoginSetting(false);
    await dependencies.store.cleanup();
    // 当前 IPC 响应完成后退出已清理的应用。
    setImmediate(() => app.quit());
    return true;
  });
}
