import { Message } from '@arco-design/web-vue';
import { ref, Ref } from 'vue';
import { AppSettings } from '@/type';
import { resolveErrorMessage } from '@/utils';
// 与主进程 store 保持一致的设置默认值，用于首屏渲染前的占位。
const DEFAULT_SETTINGS: AppSettings = {
  passes: 0,
  removeRootDirectory: true,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  rememberWindowPosition: true,
  launchAtLogin: false,
  systemNotifications: true,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
};
// 定义应用设置的读取与写入能力。
export interface AppSettingsState {
  settings: Ref<AppSettings>;
  loaded: Ref<boolean>;
  reload: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<boolean>;
  syncContextMenuStatus: () => Promise<void>;
}
// 创建应用设置状态，供设置页与清理任务页共享同一份数据。
export function useAppSettings(): AppSettingsState {
  // 保存当前生效的应用设置。
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
  // 标识设置是否已从主进程读取完成。
  const loaded = ref(false);
  // 从主进程读取最新设置。
  async function reload(): Promise<void> {
    try {
      settings.value = await window.shredderApi.getSettings();
      loaded.value = true;
    } catch (error) {
      Message.error({
        content: resolveErrorMessage(error, '设置保存失败，请稍后重试'),
      });
    }
  }
  // 保存部分设置字段，失败时保持界面与主进程一致。
  async function update(patch: Partial<AppSettings>): Promise<boolean> {
    try {
      settings.value = await window.shredderApi.updateSettings(patch);
      return true;
    } catch (error) {
      Message.error({
        content: resolveErrorMessage(error, '设置保存失败，请稍后重试'),
      });
      await reload();
      return false;
    }
  }
  // 以系统实际状态校准右键菜单设置，避免注册表被外部改动后界面失真。
  async function syncContextMenuStatus(): Promise<void> {
    try {
      // 查询系统中实际存在的右键菜单状态。
      const installed = await window.shredderApi.getContextMenuStatus();
      if (installed === settings.value.contextMenuInstalled) return;
      settings.value = { ...settings.value, contextMenuInstalled: installed };
    } catch (error) {
      Message.error({
        content: resolveErrorMessage(error, '设置保存失败，请稍后重试'),
      });
    }
  }
  return { settings, loaded, reload, update, syncContextMenuStatus };
}
