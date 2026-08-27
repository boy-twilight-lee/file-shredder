<template>
  <main class="settings-view">
    <header class="settings-view-header">
      <a-link
        class="settings-view-back"
        title="返回"
        aria-label="返回操作菜单"
        @click="emit('close')"
      >
        <icon-left />
      </a-link>
      <h1 class="settings-view-title">常规设置</h1>
    </header>

    <a-spin
      :loading="isLoading"
      class="settings-view-content"
    >
      <section class="settings-view-body">
        <general-settings-panel
          :settings="settings"
          :pet-image-templates="petImageTemplates"
          :is-choosing-pet-image="isChoosingPetImage"
          :on-before-change="updateBooleanSetting"
          @choose-pet-image="choosePetImage"
          @select-pet-image="selectPetImage"
          @delete-pet-image="deletePetImage"
          @update-pet-size="updatePetSize"
          @update-passes="updatePasses"
        />
      </section>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import { useDebounceFn } from '@vueuse/core';
import type { AppSettings, PetImageTemplate, SettingBooleanKey } from '@/type';
import { GeneralSettingsPanel } from './component';
import {
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_SAVE_DELAY_MS,
} from './constants';
import '@arco-design/web-vue/es/message/style/css.js';

const emit = defineEmits<{ close: [] }>();

const defaultSettings: AppSettings = {
  // 设置读取完成前也保持极速删除为默认选中状态。
  passes: 0,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  systemNotifications: true,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petImageTemplateId: 'built-in-ao-yin',
  uploadedPetImages: [],
  petSize: 200,
  petDisplayId: null,
  petPositionX: null,
  petPositionY: null,
};
const settings = ref<AppSettings>({ ...defaultSettings });
const petImageTemplates = ref<PetImageTemplate[]>([]);
const isLoading = ref(true);
const isChoosingPetImage = ref(false);
const disposers: Array<() => void> = [];

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

function updatePetSize(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  const normalizedValue = Math.min(
    PET_SIZE_MAX,
    Math.max(PET_SIZE_MIN, Math.round(value)),
  );
  settings.value.petSize = normalizedValue;
  // 连续调整时只在数值停止变化后合并为一次磁盘写入。
  savePetSize(normalizedValue);
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
:global(.settings-view-popconfirm) {
  min-width: 272px;
  padding: 18px;
  border-radius: 12px;

  .arco-popconfirm-body {
    margin-bottom: 18px;
  }

  .arco-popconfirm-footer > button {
    min-width: 72px;
    margin-left: 10px;
  }
}

// Arco Message 默认覆盖整个透明窗口；设置打开时改为在气泡自身顶部居中。
:global(html[data-settings-message-aligned='true'] .arco-message-list-top) {
  top: var(--settings-message-top);
  left: var(--settings-message-left);
  width: var(--settings-message-width);
}

.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: #0d1014;
  background: #f5f7fa;

  .settings-view-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 8px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #fff;
  }

  .settings-view-back {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: #79828f;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      color: #244fd6;
    }
  }

  .settings-view-title {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .settings-view-content {
    display: block;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .settings-view-body {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  // 气泡宽度有限，设置项改为适合单列阅读和操作的紧凑布局。
  &:deep(.general-settings-panel) {
    padding: 10px;

    .general-settings-panel-card {
      padding: 12px;
    }

    .general-settings-panel-template-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .general-settings-panel-pet-controls {
      gap: 10px;
    }

    .general-settings-panel-pet-size-slider {
      flex: 1;
      width: auto;
      min-width: 0;
    }

    .general-settings-panel-switch-row {
      padding: 9px;
    }

    .general-settings-panel-switch-content {
      span {
        font-size: 11px;
        line-height: 1.4;
      }
    }
  }
}
</style>
