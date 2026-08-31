<template>
  <main class="pet-bubble-records">
    <header class="pet-bubble-records-header">
      <a-link
        class="pet-bubble-records-back"
        title="返回"
        aria-label="返回操作菜单"
        @click="showBubble('actions')"
      >
        <svg-icon
          name="app-back"
          size="16"
        />
      </a-link>
      <h1 class="pet-bubble-records-title">粉碎记录</h1>
    </header>
    <a-spin
      :loading="isLoading"
      class="pet-bubble-records-content"
    >
      <div class="pet-bubble-records-panel">
        <div class="pet-bubble-records-toolbar">
          <a-input-search
            v-model="pathKeyword"
            class="pet-bubble-records-search"
            allow-clear
            placeholder="搜索文件路径"
          />
          <span class="pet-bubble-records-summary">
            共
            <strong class="pet-bubble-records-summary-total">{{
              filteredLogs.length
            }}</strong>
            条，已选
            <strong class="pet-bubble-records-summary-selected">{{
              selectedLogIds.length
            }}</strong>
            条
          </span>
          <a-popconfirm
            :content="`确定删除选中的 ${selectedLogIds.length} 条粉碎记录吗？`"
            content-class="pet-bubble-records-popconfirm"
            type="error"
            :disabled="selectedLogIds.length === 0"
            :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
            :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
            @ok="deleteSelectedLogs"
          >
            <a-button
              type="outline"
              size="small"
              :disabled="selectedLogIds.length === 0"
            >
              <template #icon>
                <svg-icon name="app-delete" />
              </template>
              批量删除
            </a-button>
          </a-popconfirm>
        </div>

        <!-- 使用 Arco Table 原生虚拟列表，固定布局避免内容改变列宽。 -->
        <a-table
          v-model:selected-keys="selectedLogIds"
          class="pet-bubble-records-table"
          row-key="id"
          stripe
          :bordered="false"
          :columns="SHRED_RECORD_COLUMNS"
          :data="filteredLogs"
          :pagination="false"
          :row-selection="SHRED_RECORD_ROW_SELECTION"
          :scroll="SHRED_RECORD_TABLE_SCROLL"
          :virtual-list-props="SHRED_RECORD_VIRTUAL_LIST_PROPS"
          style="width: 100%"
        >
          <template #path-cell="{ record }">
            <span
              class="pet-bubble-records-path"
              :title="record.path"
            >
              <svg-icon
                :name="
                  record.targetType === 'directory' ? 'app-folder' : 'app-file'
                "
                class="pet-bubble-records-path-icon"
                :aria-label="
                  record.targetType === 'directory' ? '文件夹' : '文件'
                "
              />
              <span>{{ record.path }}</span>
            </span>
          </template>
          <template #status-cell="{ record }">
            <span
              class="pet-bubble-records-status"
              :class="
                record.success
                  ? 'pet-bubble-records-status-success'
                  : 'pet-bubble-records-status-failure'
              "
            >
              <svg-icon
                v-if="record.success"
                class="pet-bubble-records-status-icon"
                name="app-check-circle"
              />
              <svg-icon
                v-else
                class="pet-bubble-records-status-icon"
                name="app-close-circle"
              />
              {{ record.success ? '成功' : '失败' }}
            </span>
          </template>
          <template #result-cell="{ record }">
            <span
              class="pet-bubble-records-result"
              :class="{
                'pet-bubble-records-result-failure': !record.success,
              }"
              :title="getLogMessage(record)"
            >
              {{ getLogMessage(record) }}
            </span>
          </template>
          <template #time-cell="{ record }">
            <time>{{
              formatDateTime(record.timestamp, SHRED_RECORD_TIME_FORMAT)
            }}</time>
          </template>
          <template #empty>
            <div class="pet-bubble-records-empty">
              <img
                :src="emptyIllustration"
                alt=""
              />
              <span>{{ emptyStateTitle }}</span>
            </div>
          </template>
        </a-table>
      </div>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import { ShredLog } from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
import { formatDateTime } from '@/utils';
import { usePetViewContext } from '@/components/pet-view/hooks';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/pet-view/component/pet-bubble/constants';
import {
  SHRED_RECORD_COLUMNS,
  SHRED_RECORD_ROW_SELECTION,
  SHRED_RECORD_TABLE_SCROLL,
  SHRED_RECORD_TIME_FORMAT,
  SHRED_RECORD_VIRTUAL_LIST_PROPS,
} from './constants';

const logs = ref<ShredLog[]>([]);
const selectedLogIds = ref<Array<string | number>>([]);
const pathKeyword = ref('');
const isLoading = ref(true);
const disposers: Array<() => void> = [];
const { showBubble } = usePetViewContext().inject();
const filteredLogs = computed(() => {
  const normalizedKeyword = pathKeyword.value.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return logs.value;
  return logs.value.filter((log) =>
    log.path.toLocaleLowerCase().includes(normalizedKeyword),
  );
});
const emptyStateTitle = computed(() =>
  logs.value.length === 0 ? '暂无粉碎记录' : '未找到匹配的粉碎记录',
);

async function refreshLogs(): Promise<void> {
  logs.value = await window.shredderApi.getLogs();
  isLoading.value = false;
}

async function deleteLogs(ids: Array<string | number>): Promise<void> {
  try {
    logs.value = await window.shredderApi.deleteLogs(ids.map(String));
    Message.success(`已删除 ${ids.length} 条粉碎记录`);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}

async function deleteSelectedLogs(): Promise<void> {
  // 复制当前选择，避免确认浮层关闭期间的响应式变化影响本次删除目标。
  await deleteLogs([...selectedLogIds.value]);
}

function getLogMessage(log: ShredLog): string {
  if (log.targetType === 'directory' && !log.success)
    return `成功 ${log.succeededCount ?? 0} 个，失败 ${log.failedCount ?? 0} 个`;
  if (log.targetType === 'directory') return '文件夹已安全删除';
  return log.success ? '文件已安全删除' : log.message;
}

watch(pathKeyword, () => {
  // 过滤条件变化后清空选择，避免批量操作包含当前不可见的记录。
  selectedLogIds.value = [];
});

watch(logs, (currentLogs) => {
  const existingIds = new Set(currentLogs.map((log) => log.id));
  selectedLogIds.value = selectedLogIds.value.filter((id) =>
    existingIds.has(String(id)),
  );
});

onMounted(async () => {
  await refreshLogs();
  disposers.push(window.shredderApi.onLogsUpdated(refreshLogs));
});

onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
</script>

<style lang="less" scoped>
@import './index.less';
</style>
