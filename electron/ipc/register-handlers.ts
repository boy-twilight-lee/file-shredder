import { app, dialog, ipcMain } from 'electron';
import { clamp } from '@/utils';
import { applyLoginSetting, getExecutablePath } from '../app';
import {
  isContextMenuInstalled,
  lockScreen,
  removeContextMenu,
} from '../integrations';
import { PetImageService, PetWindowManager } from '../pet';
import {
  getShredTargetMetadata,
  normalizeTargets,
  ShredSession,
} from '../shred';
import { AppSettings, AppStore } from '../storage';
interface IpcHandlerDependencies {
  store: AppStore;
  petImageService: PetImageService;
  shredSession: ShredSession;
  windowManager: PetWindowManager;
  getSettings: () => AppSettings;
  setSettings: (settings: AppSettings) => void;
  setContextMenuEnabled: (enabled: boolean) => Promise<void>;
  setQuitting: () => void;
}
// 限制 IPC 设置允许的最小桌宠宽度。
const PET_SIZE_MIN = 50;
// 限制 IPC 设置允许的最大桌宠宽度。
const PET_SIZE_MAX = 700;
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
  ipcMain.handle(
    'settings:update',
    async (_event, patch: Partial<AppSettings>) => {
      // 读取更新前设置供差异判断使用。
      const currentSettings = dependencies.getSettings();
      // 复制渲染进程更新并移除不允许直接修改的字段。
      const safePatch = { ...patch };
      delete safePatch.customPetImagePath;
      delete safePatch.petImageTemplateId;
      delete safePatch.uploadedPetImages;
      if (typeof safePatch.petSize === 'number')
        safePatch.petSize = clamp(
          Math.round(safePatch.petSize),
          PET_SIZE_MIN,
          PET_SIZE_MAX,
        );
      if (
        typeof safePatch.contextMenuInstalled === 'boolean' &&
        safePatch.contextMenuInstalled !== currentSettings.contextMenuInstalled
      )
        await dependencies.setContextMenuEnabled(
          safePatch.contextMenuInstalled,
        );
      // 保存经过校验与规范化的设置更新。
      const settings = await dependencies.store.updateSettings({
        ...safePatch,
        contextMenuAutoInstall: false,
      });
      dependencies.setSettings(settings);
      if (typeof safePatch.petSize === 'number')
        await dependencies.windowManager.recordPosition();
      dependencies.windowManager.setAlwaysOnTop(settings.alwaysOnTop);
      if (typeof safePatch.launchAtLogin === 'boolean')
        applyLoginSetting(safePatch.launchAtLogin);
      dependencies.windowManager.send('settings:changed');
      return dependencies.getSettings();
    },
  );
  // 返回当前桌宠形象完整数据。
  ipcMain.handle('pet-image:get', () =>
    dependencies.petImageService.getImageDataUrl(),
  );
  // 返回设置页可用的桌宠形象模板。
  ipcMain.handle('pet-image:list', () =>
    dependencies.petImageService.getTemplates(),
  );
  // 打开桌宠图片选择器并保存新模板。
  ipcMain.handle('pet-image:choose', () =>
    dependencies.petImageService.chooseImage(),
  );
  // 将指定模板设为当前桌宠形象。
  ipcMain.handle('pet-image:select', (_event, id: unknown) =>
    dependencies.petImageService.selectImage(id),
  );
  // 删除指定用户桌宠形象。
  ipcMain.handle('pet-image:delete', (_event, id: unknown) =>
    dependencies.petImageService.deleteImage(id),
  );
  // 返回全部本地粉碎记录。
  ipcMain.handle('logs:get', () => dependencies.store.getLogs());
  // 校验、去重并删除指定粉碎记录。
  ipcMain.handle('logs:delete', (_event, ids: unknown) => {
    // 确保渲染进程仅传入字符串记录标识。
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
      throw new Error('无效的粉碎记录参数');
    return dependencies.store.deleteLogs([...new Set(ids)]);
  });
  ipcMain.handle('system:lock-screen', lockScreen);
  // 标记正常退出并结束应用进程。
  ipcMain.handle('app:exit', () => {
    dependencies.setQuitting();
    // 当前 IPC 响应完成后退出应用。
    setImmediate(() => app.quit());
    return true;
  });
  // 清理系统集成与本地数据后结束应用进程。
  ipcMain.handle('app:cleanup-exit', async () => {
    await removeContextMenu();
    applyLoginSetting(false);
    await dependencies.store.cleanup();
    dependencies.setQuitting();
    // 当前 IPC 响应完成后退出已清理的应用。
    setImmediate(() => app.quit());
    return true;
  });
}
