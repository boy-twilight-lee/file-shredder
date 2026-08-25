<template>
  <main class="settings-view">
    <a-tabs
      v-model:active-key="activeTab"
      class="settings-view-tabs"
      type="line"
      size="small"
    >
      <a-tab-pane key="general">
        <template #title><icon-apps />常规设置</template>
      </a-tab-pane>
      <a-tab-pane key="records">
        <template #title><icon-history />粉碎记录</template>
      </a-tab-pane>
    </a-tabs>
    <div class="settings-view-tabs-divider"></div>

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
          @clear-logs="clearLogs"
        />
      </section>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue';
import { IconApps, IconHistory } from '@arco-design/web-vue/es/icon';
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
    Message.success(`已删除 ${ids.length} 条粉碎记录`);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}

async function clearLogs(): Promise<void> {
  try {
    await window.shredderApi.clearLogs();
    logs.value = [];
    Message.success('已删除全部粉碎记录');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录清空失败');
  }
}

onMounted(async () => {
  await refreshData();
  // 首次数据就绪后再通知主进程展示原生窗口，避免初始化期间触发重复重绘。
  window.shredderApi.notifySettingsReady();
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
:global(html[data-app-view='settings']),
:global(html[data-app-view='settings'] body),
:global(html[data-app-view='settings'] #app) {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: #f5f7fa;
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

  .settings-view-tabs {
    flex: 0 0 auto;
    padding: 0 12px;
    overflow: visible;
    background: #fff;
    :deep(.arco-tabs-nav) {
      margin: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: #fff;
      box-shadow: none;
    }
    :deep(.arco-tabs-nav::before) {
      display: none;
    }
    :deep(.arco-tabs-tab) {
      height: 40px;
      padding: 0 8px;
      border-radius: 9px;
    }
    :deep(.arco-tabs-content) {
      display: none;
    }
    :deep(.arco-tabs-tab-title) {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
  }
  .settings-view-tabs-divider {
    flex: 0 0 auto;
    height: 1px;
    background: #e7ebf0;
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
}
</style>
