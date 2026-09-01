<template>
  <main class="pet-bubble-settings">
    <header class="pet-bubble-settings-header">
      <a-link
        class="pet-bubble-settings-back"
        title="返回"
        aria-label="返回操作菜单"
        @click="showBubble('actions')"
      >
        <svg-icon
          name="app-back"
          size="16"
        />
      </a-link>
      <h1 class="pet-bubble-settings-title">常规设置</h1>
    </header>
    <a-spin
      :loading="isLoading"
      class="pet-bubble-settings-content"
    >
      <section class="pet-bubble-settings-body">
        <a-scrollbar
          class="pet-bubble-settings-scrollbar-container"
          outer-class="pet-bubble-settings-scrollbar"
          outer-style="height: 100%"
          disable-horizontal
        >
          <div class="pet-bubble-settings-list">
            <pet-image-setting
              :pet-image-templates="petImageTemplates"
              :is-choosing-pet-image="isChoosingPetImage"
              @choose-pet-image="choosePetImage"
              @select-pet-image="selectPetImage"
              @delete-pet-image="deletePetImage"
            />
            <pet-size-setting
              :model-value="settings.petSize"
              @update-pet-size="updatePetSize"
            />
            <shred-level-setting
              :model-value="settings.passes"
              @update-passes="updatePasses"
            />
            <system-setting
              :settings="settings"
              :on-before-change="updateBooleanSetting"
            />
          </div>
        </a-scrollbar>
      </section>
    </a-spin>
  </main>
</template>
<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import { useDebounceFn } from '@vueuse/core';
import type { AppSettings, PetImageTemplate, SettingBooleanKey } from '@/type';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { DEFAULT_APP_SETTINGS, PET_SIZE_SAVE_DELAY_MS } from './constants';
import {
  PetImageSetting,
  PetSizeSetting,
  ShredLevelSetting,
  SystemSetting,
} from './component';
// 保存当前设置表单数据。
const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS });
// 保存内置与用户上传的桌宠形象列表。
const petImageTemplates = ref<PetImageTemplate[]>([]);
// 标识设置页是否正在加载初始数据。
const isLoading = ref(true);
// 标识自定义桌宠形象是否正在读取。
const isChoosingPetImage = ref(false);
// 收集组件销毁时需要执行的事件清理器。
const disposers: Array<() => void> = [];
// 读取气泡页面导航能力。
const { showBubble } = usePetViewContext().inject();
// VueUse 统一管理防抖状态，并暴露 cancel 供组件卸载时取消尚未执行的保存。
const savePetSize = useDebounceFn(async (value: number) => {
  await saveSettingsPatch({ petSize: value });
}, PET_SIZE_SAVE_DELAY_MS);
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
// 保存部分设置，并在失败时恢复持久化状态。
async function saveSettingsPatch(
  patch: Partial<AppSettings>,
): Promise<boolean> {
  try {
    settings.value = await window.shredderApi.updateSettings(patch);
    return true;
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '设置保存失败');
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
    Message.error(error instanceof Error ? error.message : '图片读取失败');
  } finally {
    isChoosingPetImage.value = false;
  }
}
// 将指定模板设为当前桌宠形象。
async function selectPetImage(id: string): Promise<void> {
  try {
    petImageTemplates.value = await window.shredderApi.selectPetImage(id);
    settings.value = await window.shredderApi.getSettings();
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '桌宠形象切换失败');
  }
}
// 删除指定自定义形象并刷新当前设置。
async function deletePetImage(id: string): Promise<void> {
  try {
    petImageTemplates.value = await window.shredderApi.deletePetImage(id);
    settings.value = await window.shredderApi.getSettings();
    Message.success('自定义形象已删除');
  } catch (error) {
    Message.error(
      error instanceof Error ? error.message : '自定义形象删除失败',
    );
  }
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
</script>
<style lang="less" scoped>
@import './index.less';
</style>
