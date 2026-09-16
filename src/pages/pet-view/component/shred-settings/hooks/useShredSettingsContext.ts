import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import { useDebounceFn } from '@vueuse/core';
import { ShredSettingsContext } from '../type';
import { AppSettings, PetImageTemplate, SettingBooleanKey } from '@/type';
import { DEFAULT_APP_SETTINGS, PET_SIZE_SAVE_DELAY_MS } from '../constants';
// 标识设置页面所属组件子树中的共享上下文。
const SHRED_SETTINGS_CONTEXT_KEY: InjectionKey<ShredSettingsContext> = Symbol(
  'shred-settings-context',
);
// 暴露设置页面上下文的提供与注入能力。
export function useShredSettingsContext() {
  return {
    // 创建设置页面共享的表单状态、形象预览与保存操作。
    provide(): ShredSettingsContext {
      // 保存当前设置表单数据。
      const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS });
      // 保存内置与用户上传的桌宠形象列表。
      const petImageTemplates = ref<PetImageTemplate[]>([]);
      // 提供设置页预览使用的唯一桌宠形象地址。
      const petImageSource = computed(
        () => petImageTemplates.value[0]?.image ?? '',
      );
      // 标识当前桌宠形象是否为用户自定义版本。
      const isCustomPetImage = computed(
        () => settings.value.uploadedPetImages.length > 0,
      );
      // 标识设置页是否正在加载初始数据。
      const isLoading = ref(true);
      // 标识自定义桌宠形象是否正在读取。
      const isChoosingPetImage = ref(false);
      // 标识恢复默认桌宠形象请求是否正在执行。
      const isRestoringPetImage = ref(false);
      // 收集组件销毁时需要执行的事件清理器。
      const disposers: Array<() => void> = [];
      // VueUse 统一管理防抖状态，并暴露 cancel 供组件卸载时取消尚未执行的保存。
      const savePetSize = useDebounceFn(async (value: number) => {
        await saveSettingsPatch({ petSize: value });
      }, PET_SIZE_SAVE_DELAY_MS);
      // 保存部分设置，并在失败时恢复持久化状态。
      async function saveSettingsPatch(
        patch: Partial<AppSettings>,
      ): Promise<boolean> {
        try {
          settings.value = await window.shredderApi.updateSettings(patch);
          return true;
        } catch (error) {
          Message.error(
            error instanceof Error ? error.message : '设置保存失败',
          );
          settings.value = await window.shredderApi.getSettings();
          return false;
        }
      }
      // 保存系统布尔设置并向开关返回执行结果。
      async function updateBooleanSetting(
        key: SettingBooleanKey,
        value: boolean | string | number,
      ): Promise<boolean> {
        // Switch 等待设置落盘完成后再切换，避免系统操作期间出现状态回跳和重复点击。
        return saveSettingsPatch({ [key]: Boolean(value) });
      }
      // 保存用户选择的文件清理强度。
      async function updatePasses(value: AppSettings['passes']): Promise<void> {
        await saveSettingsPatch({ passes: value });
      }
      // 实时更新桌宠尺寸并防抖保存。
      async function updatePetSize(value: number): Promise<void> {
        settings.value.petSize = value;
        // 连续调整时只在数值停止变化后合并为一次磁盘写入。
        await savePetSize(value);
      }
      // 保存用户选择的操作气泡方位。
      async function updateBubbleDirection(
        value: AppSettings['bubbleDirection'],
      ): Promise<void> {
        await saveSettingsPatch({ bubbleDirection: value });
      }
      // 保存用户选择的操作气泡对齐方式。
      async function updateBubbleAlign(
        value: AppSettings['bubbleAlign'],
      ): Promise<void> {
        await saveSettingsPatch({ bubbleAlign: value });
      }
      // 读取用户选择的图片并设为当前桌宠形象。
      async function choosePetImage(): Promise<void> {
        isChoosingPetImage.value = true;
        try {
          // 保存主进程返回的最新桌宠形象列表。
          const templates = await window.shredderApi.choosePetImage();
          if (templates) {
            petImageTemplates.value = templates;
            settings.value = await window.shredderApi.getSettings();
            Message.success('已上传并设为当前形象');
          }
        } catch (error) {
          Message.error(
            error instanceof Error ? error.message : '图片读取失败',
          );
        } finally {
          isChoosingPetImage.value = false;
        }
      }
      // 删除当前自定义桌宠形象并恢复内置默认形象。
      async function restoreDefaultPetImage(): Promise<void> {
        // 防止请求尚未结束时重复删除同一张自定义图片。
        if (isRestoringPetImage.value || !isCustomPetImage.value) return;
        isRestoringPetImage.value = true;
        try {
          // 当前版本只保留一张自定义形象，因此删除首个模板即可恢复默认形象。
          const templates = await window.shredderApi.deletePetImage(
            settings.value.uploadedPetImages[0].id,
          );
          petImageTemplates.value = templates;
          settings.value = await window.shredderApi.getSettings();
          Message.success('已恢复默认桌宠形象');
        } catch (error) {
          Message.error(
            error instanceof Error ? error.message : '恢复默认形象失败',
          );
        } finally {
          isRestoringPetImage.value = false;
        }
      }
      // 并行加载持久化设置、右键菜单状态与桌宠形象。
      async function refreshData(): Promise<void> {
        // 汇总设置页面初始化所需的三类数据。
        const [storedSettings, contextMenuInstalled, storedPetImageTemplates] =
          await Promise.all([
            window.shredderApi.getSettings(),
            window.shredderApi.getContextMenuStatus(),
            window.shredderApi.getPetImageTemplates(),
          ]);
        settings.value = { ...storedSettings, contextMenuInstalled };
        petImageTemplates.value = storedPetImageTemplates;
        isLoading.value = false;
      }
      // 组件挂载后加载设置并订阅跨窗口变更。
      onMounted(async () => {
        await refreshData();
        disposers.push(window.shredderApi.onSettingsChanged(refreshData));
      });
      // 组件销毁前取消延迟保存并解除全部监听。
      onBeforeUnmount(() => {
        savePetSize.cancel();
        // 依次执行已注册的设置更新清理器。
        disposers.forEach((dispose) => dispose());
      });
      // 定义设置页面与全部子组件共享的上下文。
      const context: ShredSettingsContext = {
        settings,
        isLoading,
        petImageSource,
        isCustomPetImage,
        isChoosingPetImage,
        isRestoringPetImage,
        choosePetImage,
        restoreDefaultPetImage,
        updatePetSize,
        updateBubbleDirection,
        updateBubbleAlign,
        updatePasses,
        updateBooleanSetting,
      };
      provide(SHRED_SETTINGS_CONTEXT_KEY, context);
      return context;
    },
    // 读取共享的设置状态，并在所属子树外提供完整安全的默认值。
    inject(): ShredSettingsContext {
      return inject(SHRED_SETTINGS_CONTEXT_KEY, {
        settings: ref<AppSettings>({ ...DEFAULT_APP_SETTINGS }),
        isLoading: ref(false),
        petImageSource: computed(() => ''),
        isCustomPetImage: computed(() => false),
        isChoosingPetImage: ref(false),
        isRestoringPetImage: ref(false),
        // 在设置页面子树外忽略桌宠形象读取请求。
        choosePetImage: async () => {},
        // 在设置页面子树外忽略默认形象恢复请求。
        restoreDefaultPetImage: async () => {},
        // 在设置页面子树外忽略桌宠尺寸调整请求。
        updatePetSize: async () => {},
        // 在设置页面子树外忽略气泡方位调整请求。
        updateBubbleDirection: async () => {},
        // 在设置页面子树外忽略气泡对齐调整请求。
        updateBubbleAlign: async () => {},
        // 在设置页面子树外忽略清理强度调整请求。
        updatePasses: async () => {},
        // 在设置页面子树外忽略系统设置保存请求。
        updateBooleanSetting: async () => false,
      });
    },
  };
}
