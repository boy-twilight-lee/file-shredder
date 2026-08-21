<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import {
  IconApps,
  IconCheck,
  IconDelete,
  IconHistory,
  IconImage,
  IconMenu,
  IconPlus,
  IconPoweroff,
  IconPushpin,
  IconSafe,
  IconSettings,
  IconStorage,
  IconThunderbolt,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';
import type { AppSettings, PetImageTemplate, SettingBooleanKey, ShredLog } from '@/type';
import { PET_SIZE_SAVE_DELAY_MS, SHRED_LEVEL_OPTIONS } from './constants';

const defaultSettings: AppSettings = {
  shortcut: 'CommandOrControl+Shift+Delete',
  passes: 3,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petImageTemplateId: 'built-in-portrait-1',
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
const switchOptions: Array<{ key: SettingBooleanKey; label: string; description: string; icon: Component }> = [
  { key: 'alwaysOnTop', label: '桌宠始终置顶', description: '让人物保持在普通窗口上方', icon: IconPushpin },
  { key: 'launchAtLogin', label: '开机自动启动', description: '登录 Windows 后在后台启动程序', icon: IconPoweroff },
  { key: 'contextMenuInstalled', label: '资源管理器右键菜单', description: '在文件和文件夹右键菜单中添加“文件粉碎器”', icon: IconMenu },
];
const shredLevelIcons: Record<AppSettings['passes'], Component> = {
  3: IconThunderbolt,
  7: IconSafe,
  35: IconStorage,
};
const disposers: Array<() => void> = [];
let petSizeSaveTimer: ReturnType<typeof setTimeout> | undefined;

async function refreshData(): Promise<void> {
  const [storedSettings, contextMenuInstalled, storedLogs, storedPetImageTemplates] = await Promise.all([
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

async function updateBooleanSetting(key: SettingBooleanKey, value: boolean | string | number): Promise<void> {
  await saveSettingsPatch({ [key]: Boolean(value) });
}

async function updatePasses(value: AppSettings['passes']): Promise<void> {
  await saveSettingsPatch({ passes: value });
}

function updatePetSize(value: number | [number, number]): void {
  if (Array.isArray(value)) return;
  settings.value.petSize = value;
  clearTimeout(petSizeSaveTimer);
  // 连续拖动时即时更新数值，停止操作后再合并为一次磁盘写入。
  petSizeSaveTimer = setTimeout(async () => {
    await saveSettingsPatch({ petSize: value });
  }, PET_SIZE_SAVE_DELAY_MS);
}

async function choosePetImage(): Promise<void> {
  isChoosingPetImage.value = true;
  try {
    const templates = await window.shredderApi.choosePetImage();
    if (templates) {
      petImageTemplates.value = templates;
      settings.value = await window.shredderApi.getSettings();
      Message.success('已上传并设为当前桌宠');
    }
  } catch (error) {
    Message.error(error instanceof Error ? error.message : 'PNG 图片读取失败');
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
    Message.error(error instanceof Error ? error.message : '自定义形象删除失败');
  }
}

async function clearLogs(): Promise<void> {
  await window.shredderApi.clearLogs();
  logs.value = [];
  Message.success('粉碎日志已清空');
}

function cleanupAndExit(): void {
  Modal.warning({
    title: '清理全部数据并退出',
    content: '将卸载资源管理器右键菜单、关闭开机自启，并删除全部设置和日志。免安装 EXE 不会被删除。',
    okText: '清理并退出',
    cancelText: '取消',
    hideCancel: false,
    onOk: () => window.shredderApi.cleanupAndExit(),
  });
}

onMounted(async () => {
  await refreshData();
  disposers.push(
    window.shredderApi.onSettingsChanged(refreshData),
    window.shredderApi.onLogsUpdated(refreshData),
  );
});

onBeforeUnmount(() => {
  clearTimeout(petSizeSaveTimer);
  disposers.forEach((dispose) => dispose());
});
</script>

<template>
  <main class="settings-view">
    <a-scrollbar class="settings-view-scrollbar-container" outer-class="settings-view-scrollbar" disable-horizontal>
      <a-spin :loading="isLoading" class="settings-view-content">
        <a-tabs class="settings-view-tabs" default-active-key="general" type="rounded">
        <a-tab-pane key="general">
          <template #title><icon-apps />常规设置</template>
          <section class="settings-view-card">
            <h2 class="settings-view-card-heading"><span><icon-image /></span>桌宠形象</h2>
            <div class="settings-view-pet-template-list">
              <button
                v-for="item in petImageTemplates"
                :key="item.id"
                type="button"
                class="settings-view-pet-template"
                :class="{ 'settings-view-pet-template-active': item.active }"
                @click="selectPetImage(item.id)"
              >
                <span class="settings-view-pet-template-preview"><img :src="item.image" :alt="item.name" /></span>
                <span class="settings-view-pet-template-name" :title="item.name">{{ item.name }}</span>
                <span v-if="item.active" class="settings-view-pet-template-selected"><icon-check /></span>
                <a-popconfirm v-if="item.deletable" content="删除这个自定义形象？" @ok="deletePetImage(item.id)">
                  <span class="settings-view-pet-template-delete" title="删除" @click.stop><icon-delete /></span>
                </a-popconfirm>
              </button>
              <button type="button" class="settings-view-pet-template settings-view-pet-template-upload" :disabled="isChoosingPetImage" @click="choosePetImage">
                <icon-plus />
                <span>{{ isChoosingPetImage ? '正在读取' : '上传 PNG' }}</span>
              </button>
            </div>
            <div class="settings-view-pet-controls">
              <div class="settings-view-pet-size-label">
                <span>桌宠大小</span>
                <strong>{{ settings.petSize }} px</strong>
              </div>
              <a-slider :model-value="settings.petSize" :min="100" :max="320" :step="4" @change="updatePetSize" />
              <p>上传透明背景 PNG 后会加入列表并自动设为当前形象。</p>
            </div>
          </section>

          <section class="settings-view-card">
            <h2 class="settings-view-card-heading"><span><icon-safe /></span>选择文件清理强度</h2>
            <p class="settings-view-card-description">覆写次数越多，处理时间越长。普通使用选择“日常清理”即可。</p>
            <div class="settings-view-shred-level-list" role="radiogroup" aria-label="文件清理强度">
              <button
                v-for="item in SHRED_LEVEL_OPTIONS"
                :key="item.value"
                type="button"
                role="radio"
                class="settings-view-shred-level"
                :class="{ 'settings-view-shred-level-active': settings.passes === item.value }"
                :aria-checked="settings.passes === item.value"
                @click="updatePasses(item.value)"
              >
                <span class="settings-view-shred-level-icon"><component :is="shredLevelIcons[item.value]" /></span>
                <span class="settings-view-shred-level-content">
                  <span class="settings-view-shred-level-title"><strong>{{ item.title }}</strong><em>{{ item.badge }}</em></span>
                  <small>{{ item.description }}</small>
                </span>
                <span v-if="settings.passes === item.value" class="settings-view-shred-level-check"><icon-check /></span>
              </button>
            </div>
          </section>

          <section class="settings-view-card">
            <h2 class="settings-view-card-heading"><span><icon-settings /></span>桌宠与系统</h2>
            <div v-for="item in switchOptions" :key="item.key" class="settings-view-switch-row">
              <span class="settings-view-switch-icon"><component :is="item.icon" /></span>
              <div class="settings-view-switch-content"><strong>{{ item.label }}</strong><span>{{ item.description }}</span></div>
              <a-switch :model-value="settings[item.key]" @change="updateBooleanSetting(item.key, $event)" />
            </div>
          </section>
        </a-tab-pane>

        <a-tab-pane key="logs">
          <template #title><icon-history />粉碎日志</template>
          <section class="settings-view-card">
            <div class="settings-view-card-title"><h2 class="settings-view-card-heading"><span><icon-history /></span>最近记录</h2><a-button type="text" status="danger" @click="clearLogs"><template #icon><icon-delete /></template>清空日志</a-button></div>
            <a-list :data="logs" :max-height="390" size="small">
              <template #item="{ item }">
                <a-list-item>
                  <a-list-item-meta :title="item.path" :description="`${new Date(item.timestamp).toLocaleString()} · ${item.message}`" />
                  <template #actions><a-tag :color="item.success ? 'green' : 'red'">{{ item.success ? '成功' : '失败' }}</a-tag></template>
                </a-list-item>
              </template>
              <template #empty>还没有粉碎记录</template>
            </a-list>
          </section>
          <a-button type="text" status="danger" @click="cleanupAndExit"><template #icon><icon-delete /></template>清理全部应用数据并退出</a-button>
        </a-tab-pane>
        </a-tabs>
      </a-spin>
    </a-scrollbar>
  </main>
</template>

<style lang="less" scoped>
:global(*) { box-sizing: border-box; }
:global(html), :global(body), :global(#app) { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #f5f7fa; }

.settings-view {
  height: 100vh;
  overflow: hidden;
  color: #0d1014;

  .settings-view-scrollbar {
    height: 100%;
    // 扩大右侧可拖动区域，同时保持视觉上的细滚动条。
    :deep(.arco-scrollbar-track-direction-vertical) { right: 0; width: 14px; }
    :deep(.arco-scrollbar-thumb-direction-vertical .arco-scrollbar-thumb-bar) { width: 6px; margin: 0 4px; border-radius: 6px; }
  }
  :deep(.settings-view-scrollbar-container) { height: 100%; overflow-x: hidden; overflow-y: auto; }
  .settings-view-content { display: block; min-height: 470px; padding: 10px 18px 18px 16px; }
  .settings-view-tabs {
    overflow: visible;
    :deep(.arco-tabs-nav) {
      position: sticky;
      z-index: 5;
      top: 0;
      margin: 0 0 10px;
      padding: 6px;
      border: 1px solid #e7ebf0;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 4px 14px rgba(30, 55, 90, 0.05);
    }
    :deep(.arco-tabs-content) { padding-top: 0; }
  }
  .settings-view-card {
    margin-bottom: 10px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 5px 18px rgba(30, 55, 90, 0.045);
    h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; }
  }
  .settings-view-card-heading { display: flex; align-items: center; gap: 8px; }
  .settings-view-card-heading > span,
  .settings-view-switch-icon,
  .settings-view-shred-level-icon { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; color: #3564ff; background: #eef3ff; }
  .settings-view-card-heading > span { width: 28px; height: 28px; border-radius: 8px; font-size: 15px; }
  .settings-view-card-description { margin: -4px 0 12px; color: #79828f; font-size: 12px; line-height: 1.6; }

  .settings-view-shred-level-list { display: grid; gap: 8px; }
  .settings-view-shred-level {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #e7ebf0;
    border-radius: 11px;
    color: #0d1014;
    text-align: left;
    background: #f8fafc;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
    &:hover { border-color: #bed2ff; background: #f4f7ff; }
  }
  .settings-view-shred-level-active { border-color: #3564ff; background: #f2f5ff; box-shadow: 0 0 0 2px rgba(53, 100, 255, 0.09); }
  .settings-view-shred-level-icon { width: 34px; height: 34px; border-radius: 10px; font-size: 17px; }
  .settings-view-shred-level-content { display: grid; flex: 1; min-width: 0; gap: 3px; small { color: #79828f; font-size: 11px; line-height: 1.5; } }
  .settings-view-shred-level-title { display: flex; align-items: center; gap: 7px; strong { font-size: 13px; font-weight: 600; } em { padding: 1px 6px; border-radius: 8px; color: #3564ff; font-size: 10px; font-style: normal; background: #e8efff; } }
  .settings-view-shred-level-check { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; color: #fff; background: #3564ff; }

  .settings-view-switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid #edf1f5;
    border-radius: 10px;
    background: #f8fafc;
    &:first-of-type { margin-top: 0; }
  }
  .settings-view-switch-icon { width: 32px; height: 32px; margin-top: 0 !important; border-radius: 9px; font-size: 16px; }
  .settings-view-switch-content { flex: 1; min-width: 0; strong, span { display: block; } strong { font-size: 14px; font-weight: 500; } span { margin-top: 3px; color: #99a1ad; font-size: 12px; } }

  .settings-view-pet-template-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .settings-view-pet-template {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 7px;
    align-items: center;
    min-width: 0;
    height: 136px;
    padding: 8px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    color: #474f59;
    font: inherit;
    background: #f8fafc;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
    &:hover { border-color: #bed2ff; background: #f4f7ff; }
    &:disabled { cursor: wait; opacity: 0.65; }
  }
  .settings-view-pet-template-active { border-color: #3564ff; background: #f2f5ff; box-shadow: 0 0 0 2px rgba(53, 100, 255, 0.1); }
  .settings-view-pet-template-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 96px;
    overflow: hidden;
    border-radius: 9px;
    background: linear-gradient(45deg, #edf0f4 25%, transparent 25%, transparent 75%, #edf0f4 75%) 0 0 / 12px 12px, linear-gradient(45deg, #edf0f4 25%, transparent 25%, transparent 75%, #edf0f4 75%) 6px 6px / 12px 12px, #fff;
    img { width: 100%; height: 100%; object-fit: contain; }
  }
  .settings-view-pet-template-name { width: 100%; overflow: hidden; font-size: 12px; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .settings-view-pet-template-selected { position: absolute; top: 5px; left: 5px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; color: #fff; background: #3564ff; box-shadow: 0 2px 8px rgba(53, 100, 255, 0.3); }
  .settings-view-pet-template-delete { position: absolute; top: 5px; right: 5px; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; color: #86909c; background: rgba(255, 255, 255, 0.9); &:hover { color: #f53f3f; background: #fff; } }
  .settings-view-pet-template-upload { justify-content: center; color: #3564ff; border-style: dashed; background: #fff; svg { font-size: 24px; } span { font-size: 12px; } }
  .settings-view-pet-controls { margin-top: 14px; p { margin: 6px 0 0; color: #99a1ad; font-size: 12px; } }
  .settings-view-pet-size-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; color: #474f59; font-size: 13px; strong { color: #3564ff; } }
  .settings-view-card-title { display: flex; align-items: center; justify-content: space-between; h2 { margin: 0; } }

  :deep(.arco-list) { overflow: hidden; border-radius: 10px; }
  :deep(.arco-input-wrapper),
  :deep(.arco-btn),
  :deep(.arco-tag),
  :deep(.arco-popconfirm),
  :deep(.arco-tabs-tab) { border-radius: 9px; }
  :deep(.arco-tabs-tab-title) { display: inline-flex; align-items: center; gap: 6px; }
}
</style>
