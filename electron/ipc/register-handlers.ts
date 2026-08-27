import { app, dialog, ipcMain } from 'electron';
import { applyLoginSetting, getExecutablePath } from '../app';
import { isContextMenuInstalled, removeContextMenu } from '../integrations';
import type { PetImageService, PetWindowManager } from '../pet';
import {
  getShredTargetMetadata,
  normalizeTargets,
  type ShredSession,
} from '../shred';
import type { AppSettings, AppStore } from '../storage';

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

const PET_SIZE_MIN = 50;
const PET_SIZE_MAX = 700;

export function registerIpcHandlers(
  dependencies: IpcHandlerDependencies,
): void {
  ipcMain.handle(
    'targets:choose',
    async (_event, kind: 'file' | 'directory') => {
      const properties: Array<
        'openFile' | 'openDirectory' | 'multiSelections'
      > =
        kind === 'file'
          ? ['openFile', 'multiSelections']
          : ['openDirectory', 'multiSelections'];
      const result = await dialog.showOpenDialog({ properties });
      return result.canceled ? [] : result.filePaths;
    },
  );
  ipcMain.handle('shred:prepare', async (_event, paths: unknown) => {
    if (
      !Array.isArray(paths) ||
      !paths.every((item) => typeof item === 'string')
    )
      throw new Error('无效的路径参数');
    return getShredTargetMetadata(await normalizeTargets(paths));
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
      return dependencies.shredSession.start(paths, passes);
    },
  );
  ipcMain.handle('shred:cancel', () => dependencies.shredSession.cancel());
  ipcMain.handle('context-menu:install', async () => {
    await dependencies.setContextMenuEnabled(true);
    return true;
  });
  ipcMain.handle('context-menu:remove', async () => {
    await dependencies.setContextMenuEnabled(false);
    return true;
  });
  ipcMain.handle('context-menu:status', () =>
    isContextMenuInstalled(getExecutablePath()),
  );
  ipcMain.handle('settings:get', () => dependencies.getSettings());
  ipcMain.handle(
    'settings:update',
    async (_event, patch: Partial<AppSettings>) => {
      const currentSettings = dependencies.getSettings();
      const safePatch = { ...patch };
      delete safePatch.customPetImagePath;
      delete safePatch.petImageTemplateId;
      delete safePatch.uploadedPetImages;
      if (typeof safePatch.petSize === 'number')
        safePatch.petSize = Math.min(
          PET_SIZE_MAX,
          Math.max(PET_SIZE_MIN, Math.round(safePatch.petSize)),
        );
      if (
        typeof safePatch.contextMenuInstalled === 'boolean' &&
        safePatch.contextMenuInstalled !== currentSettings.contextMenuInstalled
      )
        await dependencies.setContextMenuEnabled(
          safePatch.contextMenuInstalled,
        );
      const settings = await dependencies.store.updateSettings({
        ...safePatch,
        contextMenuAutoInstall: false,
      });
      dependencies.setSettings(settings);
      dependencies.windowManager.setAlwaysOnTop(settings.alwaysOnTop);
      if (typeof safePatch.launchAtLogin === 'boolean')
        applyLoginSetting(safePatch.launchAtLogin);
      dependencies.windowManager.send('settings:changed');
      return settings;
    },
  );
  ipcMain.handle('pet-image:get', () =>
    dependencies.petImageService.getImageDataUrl(),
  );
  ipcMain.handle('pet-image:list', () =>
    dependencies.petImageService.getTemplates(),
  );
  ipcMain.handle('pet-image:choose', () =>
    dependencies.petImageService.chooseImage(),
  );
  ipcMain.handle('pet-image:select', (_event, id: unknown) =>
    dependencies.petImageService.selectImage(id),
  );
  ipcMain.handle('pet-image:delete', (_event, id: unknown) =>
    dependencies.petImageService.deleteImage(id),
  );
  ipcMain.handle('logs:get', () => dependencies.store.getLogs());
  ipcMain.handle('logs:delete', (_event, ids: unknown) => {
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
      throw new Error('无效的粉碎记录参数');
    return dependencies.store.deleteLogs([...new Set(ids)]);
  });
  ipcMain.handle('app:exit', () => {
    dependencies.setQuitting();
    setImmediate(() => app.quit());
    return true;
  });
  ipcMain.handle('app:cleanup-exit', async () => {
    await removeContextMenu();
    applyLoginSetting(false);
    await dependencies.store.cleanup();
    dependencies.setQuitting();
    setImmediate(() => app.quit());
    return true;
  });
}
