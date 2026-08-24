<template>
  <main class="settings-view">
    <a-tabs
      v-model:active-key="activeTab"
      class="settings-view-tabs"
      type="line"
      size="small">
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
      class="settings-view-content">
      <section class="settings-view-body">
        <a-scrollbar
          v-if="activeTab === 'general'"
          class="settings-view-body-scrollbar-container"
          outer-class="settings-view-body-scrollbar"
          disable-horizontal>
          <div class="settings-view-general-content">
            <section class="settings-view-card">
              <div class="settings-view-pet-heading">
                <div>
                  <h2>桌宠形象</h2>
                  <p class="settings-view-pet-tip">
                    支持 PNG、JPG、JPEG、SVG、WebP 和 GIF，单张不超过 50 MB。
                  </p>
                </div>
                <span class="settings-view-pet-recommendation"
                  >透明背景效果最佳</span
                >
              </div>
              <div class="settings-view-pet-template-list">
                <button
                  v-for="item in petImageTemplates"
                  :key="item.id"
                  type="button"
                  class="settings-view-pet-template"
                  :class="{ 'settings-view-pet-template-active': item.active }"
                  @click="selectPetImage(item.id)">
                  <span class="settings-view-pet-template-preview"
                    ><img
                      :src="item.image"
                      :alt="item.name"
                  /></span>
                  <span
                    class="settings-view-pet-template-name"
                    :title="item.name"
                    >{{ item.name }}</span
                  >
                  <span
                    v-if="item.active"
                    class="settings-view-pet-template-selected"
                    ><icon-check
                  /></span>
                  <a-popconfirm
                    v-if="item.deletable"
                    content="删除这个自定义形象？"
                    @ok="deletePetImage(item.id)">
                    <span
                      class="settings-view-pet-template-delete"
                      title="删除"
                      @click.stop
                      ><icon-delete
                    /></span>
                  </a-popconfirm>
                </button>
                <button
                  type="button"
                  class="settings-view-pet-template settings-view-pet-template-upload"
                  :disabled="isChoosingPetImage"
                  @click="choosePetImage">
                  <icon-plus />
                  <span>{{
                    isChoosingPetImage ? '正在读取' : '上传图片'
                  }}</span>
                  <small>PNG · JPG · SVG · WebP · GIF</small>
                </button>
              </div>
              <div class="settings-view-pet-controls">
                <div class="settings-view-pet-size-description">
                  <strong>桌宠大小</strong>
                  <span>调整桌宠在桌面上的显示宽度</span>
                </div>
                <div class="settings-view-pet-size-input">
                  <a-input-number
                    :model-value="settings.petSize"
                    :min="100"
                    :max="320"
                    :step="4"
                    hide-button
                    @change="updatePetSize" />
                  <span>px</span>
                </div>
              </div>
            </section>

            <section class="settings-view-card">
              <h2>选择文件清理强度</h2>
              <p class="settings-view-card-description">
                覆写次数越多，处理时间越长。普通使用选择“日常清理”即可。
              </p>
              <div
                class="settings-view-shred-level-list"
                role="radiogroup"
                aria-label="文件清理强度">
                <button
                  v-for="item in SHRED_LEVEL_OPTIONS"
                  :key="item.value"
                  type="button"
                  role="radio"
                  class="settings-view-shred-level"
                  :class="{
                    'settings-view-shred-level-active':
                      settings.passes === item.value,
                  }"
                  :aria-checked="settings.passes === item.value"
                  @click="updatePasses(item.value)">
                  <span class="settings-view-shred-level-icon"
                    ><component :is="shredLevelIcons[item.value]"
                  /></span>
                  <span class="settings-view-shred-level-content">
                    <span class="settings-view-shred-level-title"
                      ><strong>{{ item.title }}</strong
                      ><em>{{ item.badge }}</em></span
                    >
                    <small>{{ item.description }}</small>
                  </span>
                  <span
                    v-if="settings.passes === item.value"
                    class="settings-view-shred-level-check"
                    ><icon-check
                  /></span>
                </button>
              </div>
            </section>

            <section class="settings-view-card">
              <h2>桌宠与系统</h2>
              <div
                v-for="item in switchOptions"
                :key="item.key"
                class="settings-view-switch-row">
                <span class="settings-view-switch-icon"
                  ><component :is="item.icon"
                /></span>
                <div class="settings-view-switch-content">
                  <strong>{{ item.label }}</strong
                  ><span>{{ item.description }}</span>
                </div>
                <a-switch
                  :model-value="settings[item.key]"
                  @change="updateBooleanSetting(item.key, $event)" />
              </div>
            </section>
          </div>
        </a-scrollbar>

        <div
          v-else
          class="settings-view-record-content">
          <section class="settings-view-record-card">
            <div class="settings-view-record-toolbar">
              <a-popconfirm
                :content="`确认删除选中的 ${selectedLogKeys.length} 条记录？`"
                @ok="deleteLogs(selectedLogKeys)">
                <a-button
                  size="small"
                  status="danger"
                  :disabled="selectedLogKeys.length === 0">
                  <template #icon><icon-delete /></template>批量删除
                </a-button>
              </a-popconfirm>
            </div>
            <a-scrollbar
              class="settings-view-record-table-scrollbar-container"
              outer-class="settings-view-record-table-scrollbar"
              disable-horizontal>
              <a-table
                v-model:selected-keys="selectedLogKeys"
                class="settings-view-record-table"
                row-key="id"
                :columns="RECORD_TABLE_COLUMNS"
                :data="paginatedLogs"
                :row-selection="RECORD_ROW_SELECTION"
                :pagination="false"
                :bordered="false"
                stripe>
                <template #path="{ record }">
                  <span
                    class="settings-view-record-path"
                    :title="record.path"
                    >{{ record.path }}</span
                  >
                </template>
                <template #time="{ record }">
                  <span class="settings-view-record-time">{{
                    formatLogTime(record.timestamp)
                  }}</span>
                </template>
                <template #status="{ record }">
                  <a-tag
                    class="settings-view-record-status"
                    :color="record.success ? 'green' : 'red'">
                    <icon-check-circle v-if="record.success" />
                    <icon-close-circle v-else />
                    {{ record.success ? '成功' : '失败' }}
                  </a-tag>
                </template>
                <template #message="{ record }">
                  <span
                    class="settings-view-record-message"
                    :title="record.success ? '' : record.message">
                    {{ record.success ? '-' : record.message }}
                  </span>
                </template>
                <template #actions="{ record }">
                  <a-popconfirm
                    content="确认删除这条粉碎记录？"
                    @ok="deleteLogs([record.id])">
                    <a-link
                      status="danger"
                      title="删除记录"
                      >删除</a-link
                    >
                  </a-popconfirm>
                </template>
                <template #empty>
                  <div class="settings-view-record-empty">
                    <img
                      :src="emptyIllustration"
                      alt="" />
                    <strong>暂无粉碎记录</strong>
                    <span>完成文件粉碎后，处理结果会显示在这里。</span>
                  </div>
                </template>
              </a-table>
            </a-scrollbar>
            <a-divider class="settings-view-record-divider" />
            <div class="settings-view-record-pagination">
              <a-pagination
                v-model:current="recordPage"
                v-model:page-size="recordPageSize"
                size="small"
                :total="logs.length"
                :show-total="true"
                :show-page-size="true"
                :page-size-options="RECORD_PAGE_SIZE_OPTIONS"
                :show-jumper="true" />
            </div>
          </section>
        </div>
      </section>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import {
  IconApps,
  IconCheck,
  IconCheckCircle,
  IconCloseCircle,
  IconDelete,
  IconHistory,
  IconMenu,
  IconPlus,
  IconPoweroff,
  IconPushpin,
  IconSafe,
  IconStorage,
  IconThunderbolt,
} from '@arco-design/web-vue/es/icon';
import type { Component } from 'vue';
import type {
  AppSettings,
  PetImageTemplate,
  SettingBooleanKey,
  ShredLog,
} from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
import {
  PET_SIZE_SAVE_DELAY_MS,
  RECORD_PAGE_SIZE,
  RECORD_PAGE_SIZE_OPTIONS,
  RECORD_ROW_SELECTION,
  RECORD_TABLE_COLUMNS,
  SHRED_LEVEL_OPTIONS,
} from './constants';

const defaultSettings: AppSettings = {
  shortcut: 'CommandOrControl+Shift+Delete',
  passes: 3,
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
const selectedLogKeys = ref<Array<string | number>>([]);
const recordPage = ref(1);
const recordPageSize = ref(RECORD_PAGE_SIZE);
const paginatedLogs = computed(() => {
  const startIndex = (recordPage.value - 1) * recordPageSize.value;
  return logs.value.slice(startIndex, startIndex + recordPageSize.value);
});
const switchOptions: Array<{
  key: SettingBooleanKey;
  label: string;
  description: string;
  icon: Component;
}> = [
  {
    key: 'alwaysOnTop',
    label: '桌宠始终置顶',
    description: '让人物保持在普通窗口上方',
    icon: IconPushpin,
  },
  {
    key: 'launchAtLogin',
    label: '开机自动启动',
    description: '登录 Windows 后在后台启动程序',
    icon: IconPoweroff,
  },
  {
    key: 'contextMenuInstalled',
    label: '资源管理器右键菜单',
    description: '在文件和文件夹右键菜单中添加“文件粉碎精灵”',
    icon: IconMenu,
  },
];
const shredLevelIcons: Record<AppSettings['passes'], Component> = {
  0: IconDelete,
  3: IconThunderbolt,
  7: IconSafe,
  35: IconStorage,
};
const disposers: Array<() => void> = [];
let petSizeSaveTimer: ReturnType<typeof setTimeout> | undefined;

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
  const normalizedValue = Math.min(320, Math.max(100, Math.round(value)));
  settings.value.petSize = normalizedValue;
  clearTimeout(petSizeSaveTimer);
  // 连续输入时即时更新数值，停止操作后再合并为一次磁盘写入。
  petSizeSaveTimer = setTimeout(async () => {
    await saveSettingsPatch({ petSize: normalizedValue });
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

function formatLogTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

async function deleteLogs(ids: Array<string | number>): Promise<void> {
  try {
    logs.value = await window.shredderApi.deleteLogs(ids.map(String));
    selectedLogKeys.value = [];
    Message.success(`已删除 ${ids.length} 条粉碎记录`);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}

watch([() => logs.value.length, recordPageSize], ([logCount]) => {
  // 删除记录、接收外部更新或调整每页数量后，确保当前页仍然有效。
  const lastPage = Math.max(1, Math.ceil(logCount / recordPageSize.value));
  recordPage.value = Math.min(recordPage.value, lastPage);
});

onMounted(async () => {
  await refreshData();
  // 首次数据和缩略图就绪后再展示原生窗口，避免用户在初始化解码期间触发缩放重绘。
  window.shredderApi.notifySettingsReady();
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
      border-radius: 0;
    }
    :deep(.arco-tabs-content) {
      display: none;
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
  .settings-view-body-scrollbar {
    width: 100%;
    height: 100%;
    min-height: 0;
    // 滚动仅发生在 tabs 下方的内容区，右侧保留较宽的拖动热区。
    :deep(.arco-scrollbar-track-direction-vertical) {
      right: 0;
      width: 14px;
    }
    :deep(.arco-scrollbar-thumb-direction-vertical .arco-scrollbar-thumb-bar) {
      width: 6px;
      margin: 0 4px;
      border-radius: 6px;
    }
  }
  :deep(.settings-view-body-scrollbar-container) {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .settings-view-general-content {
    padding: 12px;
  }
  .settings-view-record-content {
    width: 100%;
    height: 100%;
    padding: 12px;
  }
  .settings-view-card {
    margin-bottom: 10px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 5px 18px rgba(30, 55, 90, 0.045);
    h2 {
      margin: 0 0 12px;
      font-size: 15px;
      font-weight: 600;
    }
  }
  .settings-view-switch-icon,
  .settings-view-shred-level-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: #3564ff;
    background: #eef3ff;
  }
  .settings-view-card-description {
    margin: -4px 0 12px;
    color: #79828f;
    font-size: 12px;
    line-height: 1.6;
  }

  .settings-view-shred-level-list {
    display: grid;
    gap: 8px;
  }
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
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      box-shadow 160ms ease;
    &:hover {
      border-color: #bed2ff;
      background: #f4f7ff;
    }
  }
  .settings-view-shred-level-active {
    border-color: #3564ff;
    background: #f2f5ff;
    box-shadow: 0 0 0 2px rgba(53, 100, 255, 0.09);
  }
  .settings-view-shred-level-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 17px;
  }
  .settings-view-shred-level-content {
    display: grid;
    flex: 1;
    min-width: 0;
    gap: 3px;
    small {
      color: #79828f;
      font-size: 11px;
      line-height: 1.5;
    }
  }
  .settings-view-shred-level-title {
    display: flex;
    align-items: center;
    gap: 7px;
    strong {
      font-size: 13px;
      font-weight: 600;
    }
    em {
      padding: 1px 6px;
      border-radius: 8px;
      color: #3564ff;
      font-size: 10px;
      font-style: normal;
      background: #e8efff;
    }
  }
  .settings-view-shred-level-check {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: #fff;
    background: #3564ff;
  }

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
    &:first-of-type {
      margin-top: 0;
    }
  }
  .settings-view-switch-icon {
    width: 32px;
    height: 32px;
    margin-top: 0 !important;
    border-radius: 9px;
    font-size: 16px;
  }
  .settings-view-switch-content {
    flex: 1;
    min-width: 0;
    strong,
    span {
      display: block;
    }
    strong {
      font-size: 14px;
      font-weight: 500;
    }
    span {
      margin-top: 3px;
      color: #99a1ad;
      font-size: 12px;
    }
  }

  .settings-view-pet-template-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }
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
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      box-shadow 160ms ease;
    &:hover {
      border-color: #bed2ff;
      background: #f4f7ff;
    }
    &:disabled {
      cursor: wait;
      opacity: 0.65;
    }
  }
  .settings-view-pet-template-active {
    border-color: #3564ff;
    background: #f2f5ff;
    box-shadow: 0 0 0 2px rgba(53, 100, 255, 0.1);
  }
  .settings-view-pet-template-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 96px;
    overflow: hidden;
    border-radius: 9px;
    background:
      linear-gradient(
          45deg,
          #edf0f4 25%,
          transparent 25%,
          transparent 75%,
          #edf0f4 75%
        )
        0 0 / 12px 12px,
      linear-gradient(
          45deg,
          #edf0f4 25%,
          transparent 25%,
          transparent 75%,
          #edf0f4 75%
        )
        6px 6px / 12px 12px,
      #fff;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  .settings-view-pet-template-name {
    width: 100%;
    overflow: hidden;
    font-size: 12px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settings-view-pet-template-selected {
    position: absolute;
    top: 5px;
    left: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    color: #fff;
    background: #3564ff;
    box-shadow: 0 2px 8px rgba(53, 100, 255, 0.3);
  }
  .settings-view-pet-template-delete {
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    color: #86909c;
    background: rgba(255, 255, 255, 0.9);
    &:hover {
      color: #f53f3f;
      background: #fff;
    }
  }
  .settings-view-pet-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    h2 {
      margin-bottom: 4px;
    }
  }
  .settings-view-pet-recommendation {
    flex: 0 0 auto;
    padding: 4px 8px;
    border-radius: 10px;
    color: #3564ff;
    font-size: 11px;
    line-height: 1.4;
    background: #eef3ff;
  }
  .settings-view-pet-template-upload {
    justify-content: center;
    color: #3564ff;
    border-style: dashed;
    background: #fff;
    svg {
      font-size: 24px;
    }
    span {
      font-size: 12px;
    }
    small {
      color: #99a1ad;
      font-size: 9px;
      white-space: nowrap;
    }
  }
  .settings-view-pet-tip {
    margin: 0;
    color: #99a1ad;
    font-size: 12px;
    line-height: 1.5;
  }
  .settings-view-pet-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 14px;
    padding: 11px 12px;
    border: 1px solid #edf1f5;
    border-radius: 10px;
    background: #f8fafc;
  }
  .settings-view-pet-size-description {
    flex: 1;
    min-width: 0;
    strong,
    span {
      display: block;
    }
    strong {
      color: #474f59;
      font-size: 13px;
      font-weight: 500;
    }
    span {
      margin-top: 3px;
      color: #99a1ad;
      font-size: 11px;
    }
  }
  .settings-view-pet-size-input {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 7px;
    color: #79828f;
    font-size: 12px;
    :deep(.arco-input-number) {
      width: 104px;
    }
  }

  .settings-view-record-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 16px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 5px 18px rgba(30, 55, 90, 0.045);
  }
  .settings-view-record-toolbar {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    min-height: 32px;
    padding: 0 0 10px;
  }
  .settings-view-record-divider {
    flex: 0 0 auto;
    margin: 12px 0 0;
    border-color: #e7ebf0;
  }
  .settings-view-record-pagination {
    display: flex;
    flex: 0 0 auto;
    justify-content: center;
    align-items: center;
    min-height: 42px;
    padding-top: 10px;
  }
  .settings-view-record-table-scrollbar {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  :deep(.settings-view-record-table-scrollbar-container) {
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .settings-view-record-table {
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .settings-view-record-path {
    display: block;
    overflow: hidden;
    color: #1d252f;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settings-view-record-time {
    color: #79828f;
    font-size: 12px;
    white-space: nowrap;
  }
  .settings-view-record-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .settings-view-record-message {
    display: block;
    overflow: hidden;
    color: #79828f;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settings-view-record-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 380px;
    padding: 28px 20px;
    color: #99a1ad;
    text-align: center;
    img {
      width: 190px;
      max-width: 68%;
      height: auto;
      margin-bottom: 12px;
    }
    strong {
      color: #474f59;
      font-size: 14px;
      font-weight: 600;
    }
    span {
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.6;
    }
  }

  :deep(.settings-view-record-table .arco-table-container) {
    border-radius: 0;
  }
  // 表头使用原生 sticky 跟随单一滚动容器，避免缩放时拆分表格反复测量列宽。
  :deep(.settings-view-record-table .arco-table-th) {
    position: sticky;
    z-index: 2;
    top: 0;
    height: 40px;
    border-bottom: 0;
    color: #3f6fa8;
    font-size: 12px;
    font-weight: 400;
    vertical-align: middle;
    background: #f1f3f6;
  }
  :deep(.settings-view-record-table .arco-table-th .arco-table-cell) {
    display: flex;
    align-items: center;
    min-height: 40px;
  }
  :deep(
    .settings-view-record-table
      .arco-table-th.arco-table-col-fixed-right
      .arco-table-cell
  ),
  :deep(
    .settings-view-record-table
      .arco-table-th.arco-table-cell-align-center
      .arco-table-cell
  ) {
    justify-content: center;
  }
  :deep(.settings-view-record-table .arco-table-th:first-child) {
    border-radius: 8px 0 0 8px;
  }
  :deep(.settings-view-record-table .arco-table-th:last-child) {
    border-radius: 0 8px 8px 0;
  }
  :deep(.settings-view-record-table .arco-table-td) {
    height: 48px;
    border-bottom: 0;
    vertical-align: middle;
    background: #fff;
  }
  :deep(.settings-view-record-table .arco-table-td .arco-table-cell) {
    display: flex;
    align-items: center;
    min-height: 48px;
  }
  :deep(
    .settings-view-record-table
      .arco-table-tbody
      .arco-table-tr:nth-child(even)
      .arco-table-td
  ) {
    background: #f7f8fa;
  }
  :deep(.settings-view-record-table .arco-table-tr:hover .arco-table-td) {
    background: #f1f5fa;
  }
  :deep(
    .settings-view-record-table-scrollbar
      .arco-scrollbar-track-direction-vertical
  ) {
    width: 14px;
  }
  :deep(
    .settings-view-record-table-scrollbar
      .arco-scrollbar-thumb-direction-vertical
      .arco-scrollbar-thumb-bar
  ) {
    width: 6px;
    margin: 0 4px;
    border-radius: 6px;
  }
  :deep(.settings-view-record-pagination .arco-pagination) {
    justify-content: center;
    flex-wrap: wrap;
    row-gap: 8px;
  }
  :deep(.arco-input-wrapper),
  :deep(.arco-btn),
  :deep(.arco-tag),
  :deep(.arco-popconfirm),
  :deep(.arco-tabs-tab) {
    border-radius: 9px;
  }
  :deep(.arco-tabs-tab-title) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}
</style>
