<template>
  <main class="settings-view">
    <header class="settings-view-header">
      <button
        class="settings-view-back"
        type="button"
        title="返回"
        aria-label="返回操作菜单"
        @click="emit('close')"
      >
        <icon-left />
      </button>
      <a-tabs
        v-model:active-key="activeTab"
        class="settings-view-tabs"
        type="capsule"
        size="small"
        aria-label="设置导航"
      >
        <a-tab-pane key="general">
          <template #title><icon-apps />常规设置</template>
        </a-tab-pane>
        <a-tab-pane key="records">
          <template #title><icon-history />粉碎记录</template>
        </a-tab-pane>
      </a-tabs>
    </header>

    <a-spin
      :loading="isLoading"
      class="settings-view-content"
    >
      <section class="settings-view-body">
        <general-settings-panel
          v-if="activeTab === 'general'"
          :settings="settings"
          :pet-image-templates="petImageTemplates"
          :is-choosing-pet-image="isChoosingPetImage"
          @choose-pet-image="choosePetImage"
          @select-pet-image="selectPetImage"
          @delete-pet-image="deletePetImage"
          @update-pet-size="updatePetSize"
          @update-passes="updatePasses"
          @update-boolean-setting="updateBooleanSetting"
        />
        <shred-record-panel
          v-else
          :logs="logs"
          @delete-logs="deleteLogs"
        />
      </section>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import { useDebounceFn } from '@vueuse/core';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type {
  AppSettings,
  PetImageTemplate,
  SettingBooleanKey,
  ShredLog,
} from '@/type';
import { GeneralSettingsPanel, ShredRecordPanel } from './component';
import {
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_SAVE_DELAY_MS,
} from './constants';
import '@arco-design/web-vue/es/message/style/css.js';

const emit = defineEmits<{ close: [] }>();

const defaultSettings: AppSettings = {
  shortcut: 'CommandOrControl+Shift+Delete',
  // 设置读取完成前也保持极速删除为默认选中状态。
  passes: 0,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
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
const logs = ref<ShredLog[]>([]);
const isLoading = ref(true);
const isChoosingPetImage = ref(false);
const activeTab = ref<'general' | 'records'>('general');
const disposers: Array<() => void> = [];

// VueUse 统一管理防抖状态，并暴露 cancel 供组件卸载时取消尚未执行的保存。
const savePetSize = useDebounceFn(async (value: number) => {
  await saveSettingsPatch({ petSize: value });
}, PET_SIZE_SAVE_DELAY_MS);

async function refreshData(): Promise<void> {
  const [
    storedSettings,
    contextMenuInstalled,
    storedLogs,
    storedPetImageTemplates,
  ] = await Promise.all([
    window.shredderApi.getSettings(),
    window.shredderApi.getContextMenuStatus(),
    window.shredderApi.getLogs(),
    window.shredderApi.getPetImageTemplates(),
  ]);
  settings.value = { ...storedSettings, contextMenuInstalled };
  petImageTemplates.value = storedPetImageTemplates;
  logs.value = storedLogs;
  isLoading.value = false;
}

async function saveSettingsPatch(patch: Partial<AppSettings>): Promise<void> {
  try {
    settings.value = await window.shredderApi.updateSettings(patch);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '设置保存失败');
    settings.value = await window.shredderApi.getSettings();
  }
}

async function updateBooleanSetting(
  key: SettingBooleanKey,
  value: boolean | string | number,
): Promise<void> {
  await saveSettingsPatch({ [key]: Boolean(value) });
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

async function deleteLogs(ids: Array<string | number>): Promise<void> {
  try {
    logs.value = await window.shredderApi.deleteLogs(ids.map(String));
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}

onMounted(async () => {
  await refreshData();
  disposers.push(
    window.shredderApi.onSettingsChanged(refreshData),
    window.shredderApi.onLogsUpdated(refreshData),
  );
});

onBeforeUnmount(() => {
  savePetSize.cancel();
  disposers.forEach((dispose) => dispose());
});
</script>

<style lang="less" scoped>
:global(*) {
  box-sizing: border-box;
}
:global(.settings-view-popconfirm) {
  min-width: 272px;
  padding: 18px;
  border-radius: 12px;
}

:global(.settings-view-popconfirm .arco-popconfirm-body) {
  margin-bottom: 18px;
}

:global(.settings-view-popconfirm .arco-popconfirm-footer > button) {
  min-width: 72px;
  margin-left: 10px;
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
    padding: 8px 10px 8px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #fff;
  }

  .settings-view-tabs {
    flex: 1;
    min-width: 0;
    padding: 0;
    overflow: visible;

    :deep(.arco-tabs-nav) {
      margin: 0;
      padding: 0;
      border: 0;
      background: #fff;
      box-shadow: none;
    }

    :deep(.arco-tabs-nav::before) {
      display: none;
    }

    :deep(
      .arco-tabs-nav-type-capsule
        .arco-tabs-nav-tab:not(.arco-tabs-nav-tab-scroll)
    ) {
      justify-content: center;
    }

    :deep(.arco-tabs-nav-tab-list) {
      display: inline-flex;
      gap: 2px;
      padding: 2px;
      border: 1px solid #e8ebf0;
      border-radius: 9px;
      background: #f2f4f7;
    }

    :deep(.arco-tabs-tab) {
      height: 28px;
      padding: 0 11px;
      border-radius: 6px;
      color: #66707d;
      font-size: 12px;
      line-height: 28px;
      transition:
        color 160ms ease,
        background-color 160ms ease,
        box-shadow 160ms ease;
    }

    :deep(
      .arco-tabs-nav-type-capsule.arco-tabs-nav-horizontal
        .arco-tabs-tab:not(:first-of-type)
    ) {
      margin-left: 0;
    }

    :deep(.arco-tabs-tab::before) {
      display: none;
    }

    :deep(.arco-tabs-tab:hover) {
      color: #3564ff;
      background: rgba(255, 255, 255, 0.64);
    }

    :deep(.arco-tabs-tab-active),
    :deep(.arco-tabs-tab-active:hover) {
      color: #244fd6;
      font-weight: 500;
      background: #fff;
      box-shadow: 0 1px 4px rgba(31, 50, 81, 0.12);
    }

    :deep(.arco-tabs-content) {
      display: none;
    }

    :deep(.arco-tabs-tab-title) {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    :deep(.arco-icon) {
      font-size: 13px;
    }
  }

  .settings-view-back {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    color: #79828f;
    font-size: 15px;
    background: transparent;
    cursor: pointer;

    &:hover {
      color: #244fd6;
      background: #f0f3f8;
    }
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
  :deep(.general-settings-panel) {
    padding: 10px;
  }

  :deep(.general-settings-panel .general-settings-panel-card) {
    padding: 12px;
  }

  :deep(.general-settings-panel-template-list) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.general-settings-panel-pet-controls) {
    gap: 10px;
  }

  :deep(.general-settings-panel-pet-size-slider) {
    flex: 1;
    width: auto;
    min-width: 0;
  }

  :deep(.general-settings-panel-switch-row) {
    padding: 9px;
  }

  :deep(.general-settings-panel-switch-content span) {
    font-size: 11px;
    line-height: 1.4;
  }
}
</style>
