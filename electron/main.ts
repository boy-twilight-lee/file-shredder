import { app, BrowserWindow, screen } from 'electron';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onWindowDrag } from 'electron-drag-window/electron';
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
import { AppStore, type AppSettings } from './storage';

const store = new AppStore(app);
const runtimeDirectory = dirname(fileURLToPath(import.meta.url));
let currentSettings: AppSettings;
let isQuitting = false;
let launchTimer: NodeJS.Timeout | undefined;
let startupMaintenanceTimer: NodeJS.Timeout | undefined;
let queuedLaunchPaths: string[] = [];
let shouldShowPetOnReady = false;
let petImageService: PetImageService;

const petWindowManager = createPetWindowManager({
  runtimeDirectory,
  getSettings: () => currentSettings,
  updateSettings: async (patch) => {
    currentSettings = await store.updateSettings(patch);
    return currentSettings;
  },
  getActiveImagePath: () => petImageService.getActiveImagePath(),
  isQuitting: () => isQuitting,
});
petImageService = new PetImageService(store, {
  getSettings: () => currentSettings,
  onSettingsUpdated: (settings) => {
    currentSettings = settings;
  },
  notifyAppearanceChanged: () => petWindowManager.send('settings:changed'),
  restoreSettingsBubble: () => petWindowManager.send('pet:open-settings'),
});
const shredSession = createShredSession({
  store,
  windowManager: petWindowManager,
  getSettings: () => currentSettings,
});

// vite-plugin-electron 在主进程热更新后复用窗口，只刷新渲染内容。
if (process.env.VITE_DEV_SERVER_URL) {
  process.on('message', (message) => {
    if (message !== 'electron-vite&type=hot-reload') return;
    BrowserWindow.getAllWindows().forEach((window) =>
      window.webContents.reload(),
    );
  });
}

function parseLaunchPaths(argv: string[]): string[] {
  const marker = argv.indexOf('--shred');
  if (marker < 0) return [];
  return argv
    .slice(marker + 1)
    .map((item) => resolve(item))
    .filter(existsSync);
}

async function requestPetConfirmation(paths: string[]): Promise<void> {
  const normalizedPaths = await normalizeTargets(paths);
  if (normalizedPaths.length === 0) return;
  const targets = await getShredTargetMetadata(normalizedPaths);
  petWindowManager.show();
  petWindowManager.setExpanded(true);
  petWindowManager.send('pet:confirm', targets, currentSettings.passes);
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
  petWindowManager.send('settings:changed');
}

function handleSecondInstance(argv: string[]): void {
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

async function runStartupMaintenance(): Promise<void> {
  // 即使设置已关闭也执行一次，以清理由旧版本遗留的错误启动项。
  applyLoginSetting(currentSettings.launchAtLogin);
  await petImageService.migrateLegacyImage();
  if (process.platform !== 'win32') return;
  await updateContextMenuIcon(getWindowsIconPath());
  const contextMenuInstalled =
    await isContextMenuInstalled(getExecutablePath());
  if (contextMenuInstalled)
    await installContextMenu(getExecutablePath(), getWindowsIconPath());
  currentSettings = await store.updateSettings({
    contextMenuInstalled,
    contextMenuAutoInstall: false,
  });
}

function scheduleStartupMaintenance(): void {
  startupMaintenanceTimer = setTimeout(() => {
    runStartupMaintenance().catch((error: unknown) => {
      console.error('Startup maintenance failed:', error);
    });
  }, 1000);
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();
else {
  app.on('second-instance', (_event, argv) => handleSecondInstance(argv));
  app.whenReady().then(async () => {
    currentSettings = await store.getSettings();
    petWindowManager.create();
    onWindowDrag();
    screen.on('display-removed', petWindowManager.restorePosition);
    screen.on('display-metrics-changed', petWindowManager.restorePosition);
    queueLaunchPaths(parseLaunchPaths(process.argv));
    if (shouldShowPetOnReady) {
      shouldShowPetOnReady = false;
      petWindowManager.show();
    }
    scheduleStartupMaintenance();
  });
}

registerIpcHandlers({
  store,
  petImageService,
  shredSession,
  windowManager: petWindowManager,
  getSettings: () => currentSettings,
  setSettings: (settings) => {
    currentSettings = settings;
  },
  setContextMenuEnabled,
  setQuitting: () => {
    isQuitting = true;
  },
});
app.on('window-all-closed', () => undefined);
app.on('will-quit', () => {
  clearTimeout(launchTimer);
  clearTimeout(startupMaintenanceTimer);
  petWindowManager.dispose();
});
