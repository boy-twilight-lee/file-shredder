<template>
  <div class="shred-record-panel">
    <div class="shred-record-panel-toolbar">
      <a-input-search
        v-model="pathKeyword"
        class="shred-record-panel-search"
        allow-clear
        placeholder="搜索文件路径"
      />
      <span class="shred-record-panel-summary">
        共
        <strong class="shred-record-panel-summary-total">{{
          filteredLogs.length
        }}</strong>
        条，已选
        <strong class="shred-record-panel-summary-selected">{{
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
          <template #icon><icon-delete /></template>
          批量删除
        </a-button>
      </a-popconfirm>
    </div>

    <!-- 使用 Arco Table 原生虚拟列表，固定布局避免内容改变列宽。 -->
    <a-table
      v-model:selected-keys="selectedLogIds"
      class="shred-record-panel-table"
      row-key="id"
      stripe
      :bordered="false"
      :columns="SHRED_RECORD_COLUMNS"
      :data="filteredLogs"
      :pagination="false"
      :row-selection="SHRED_RECORD_ROW_SELECTION"
      :scroll="SHRED_RECORD_TABLE_SCROLL"
      :virtual-list-props="SHRED_RECORD_VIRTUAL_LIST_PROPS"
    >
      <template #path-cell="{ record }">
        <span
          class="shred-record-panel-path"
          :title="record.path"
        >
          <component
            :is="record.targetType === 'directory' ? IconFolder : IconFile"
            class="shred-record-panel-path-icon"
            :aria-label="record.targetType === 'directory' ? '文件夹' : '文件'"
          />
          <span>{{ record.path }}</span>
        </span>
      </template>
      <template #status-cell="{ record }">
        <span
          class="shred-record-panel-status"
          :class="
            record.success
              ? 'shred-record-panel-status-success'
              : 'shred-record-panel-status-failure'
          "
        >
          <icon-check-circle v-if="record.success" />
          <icon-close-circle v-else />
          {{ record.success ? '成功' : '失败' }}
        </span>
      </template>
      <template #result-cell="{ record }">
        <span
          class="shred-record-panel-result"
          :class="{ 'shred-record-panel-result-failure': !record.success }"
          :title="getLogMessage(record)"
        >
          {{ getLogMessage(record) }}
        </span>
      </template>
      <template #time-cell="{ record }">
        <time>{{ formatLogTime(record.timestamp) }}</time>
      </template>
      <template #empty>
        <div class="shred-record-panel-empty">
          <img
            :src="emptyIllustration"
            alt=""
          />
          <span>{{ emptyStateTitle }}</span>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { IconFile, IconFolder } from '@arco-design/web-vue/es/icon';
import type { ShredLog } from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
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

const props = defineProps<{ logs: ShredLog[] }>();
const emit = defineEmits<{
  'delete-logs': [ids: Array<string | number>];
}>();

const selectedLogIds = ref<Array<string | number>>([]);
const pathKeyword = ref('');
const filteredLogs = computed(() => {
  const normalizedKeyword = pathKeyword.value.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return props.logs;
  return props.logs.filter((log) =>
    log.path.toLocaleLowerCase().includes(normalizedKeyword),
  );
});
const emptyStateTitle = computed(() =>
  props.logs.length === 0 ? '暂无粉碎记录' : '未找到匹配的粉碎记录',
);

function deleteSelectedLogs(): void {
  // 复制当前选择，避免确认浮层关闭期间的响应式变化影响本次删除目标。
  emit('delete-logs', [...selectedLogIds.value]);
}

function formatLogTime(timestamp: string): string {
  return dayjs(timestamp).format(SHRED_RECORD_TIME_FORMAT);
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

watch(
  () => props.logs,
  (logs) => {
    const existingIds = new Set(logs.map((log) => log.id));
    selectedLogIds.value = selectedLogIds.value.filter((id) =>
      existingIds.has(String(id)),
    );
  },
);
</script>

<style lang="less" scoped>
@import './index.less';
</style>
