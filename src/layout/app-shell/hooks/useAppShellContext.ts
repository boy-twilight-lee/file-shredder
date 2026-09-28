import {
  inject as injectFromVue,
  provide as provideToVue,
  ref,
  Ref,
} from 'vue';
import { DEFAULT_PAGE_KEY } from '@/constants';
import { AppSettings, PageKey } from '@/type';
import { AppSettingsState, useAppSettings } from './useAppSettings';
import {
  createFallbackShredTask,
  ShredTask,
  useShredTask,
} from './useShredTask';
// 定义应用外壳向全部页面暴露的上下文。
export interface AppShellContext {
  activePage: Ref<PageKey>;
  setActivePage: (page: PageKey) => void;
  task: ShredTask;
  appSettings: AppSettingsState;
}
// 应用外壳上下文的唯一标识，避免与其他 provide 冲突。
const APP_SHELL_CONTEXT_KEY = Symbol('app-shell-context');
// 与主进程设置默认值保持一致，用于上下文缺失时的安全回退。
const FALLBACK_SETTINGS: AppSettings = {
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
// 创建上下文缺失时的完整回退对象，字段与提供侧一一对应。
function createFallbackContext(): AppShellContext {
  // 回退场景下不产生任何副作用。
  const noop = (): void => undefined;
  return {
    activePage: ref<PageKey>(DEFAULT_PAGE_KEY),
    setActivePage: noop,
    task: createFallbackShredTask(),
    appSettings: {
      settings: ref<AppSettings>({ ...FALLBACK_SETTINGS }),
      loaded: ref(false),
      reload: async () => undefined,
      update: async () => false,
      syncContextMenuStatus: async () => undefined,
    },
  };
}
// 应用外壳上下文：外壳组件调用 provide，页面组件调用 inject。
export function useAppShellContext() {
  // 在外壳组件中创建上下文 owned 的全部状态与动作。
  function provide(): AppShellContext {
    // 保存当前展示的页面标识。
    const activePage = ref<PageKey>(DEFAULT_PAGE_KEY);
    // 创建应用设置状态，供设置页与任务页共享。
    const appSettings = useAppSettings();
    // 创建清理任务状态机，任务在页面切换期间持续运行。
    const task = useShredTask(() => appSettings.settings.value);
    // 切换当前展示的页面。
    function setActivePage(page: PageKey): void {
      activePage.value = page;
    }
    const context: AppShellContext = {
      activePage,
      setActivePage,
      task,
      appSettings,
    };
    provideToVue(APP_SHELL_CONTEXT_KEY, context);
    return context;
  }
  // 在页面组件中读取上下文，缺少提供者时返回安全空实现。
  function inject(): AppShellContext {
    return injectFromVue(APP_SHELL_CONTEXT_KEY, createFallbackContext());
  }
  return { provide, inject };
}
