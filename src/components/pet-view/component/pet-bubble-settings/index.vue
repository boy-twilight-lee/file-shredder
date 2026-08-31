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

const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS });
const petImageTemplates = ref<PetImageTemplate[]>([]);
const isLoading = ref(true);
const isChoosingPetImage = ref(false);
const disposers: Array<() => void> = [];
const { showBubble } = usePetViewContext().inject();

// VueUse 统一管理防抖状态，并暴露 cancel 供组件卸载时取消尚未执行的保存。
const savePetSize = useDebounceFn(async (value: number) => {
  await saveSettingsPatch({ petSize: value });
}, PET_SIZE_SAVE_DELAY_MS);

async function refreshData(): Promise<void> {
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

async function updateBooleanSetting(
  key: SettingBooleanKey,
  value: boolean | string | number,
): Promise<boolean> {
  // Switch 等待设置落盘完成后再切换，避免系统操作期间出现状态回跳和重复点击。
  return saveSettingsPatch({ [key]: Boolean(value) });
}

async function updatePasses(value: AppSettings['passes']): Promise<void> {
  await saveSettingsPatch({ passes: value });
}

async function updatePetSize(value: number): Promise<void> {
  settings.value.petSize = value;
  // 连续调整时只在数值停止变化后合并为一次磁盘写入。
  await savePetSize(value);
}

async function choosePetImage(): Promise<void> {
  isChoosingPetImage.value = true;
  try {
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

async function selectPetImage(id: string): Promise<void> {
  try {
    petImageTemplates.value = await window.shredderApi.selectPetImage(id);
    settings.value = await window.shredderApi.getSettings();
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '桌宠形象切换失败');
  }
}

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

onMounted(async () => {
  await refreshData();
  disposers.push(window.shredderApi.onSettingsChanged(refreshData));
});

onBeforeUnmount(() => {
  savePetSize.cancel();
  disposers.forEach((dispose) => dispose());
});
</script>

<style lang="less" scoped>
@import './index.less';
</style>
