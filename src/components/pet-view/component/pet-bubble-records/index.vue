<template>
  <a-spin
    :loading="isLoading"
    class="shred-records"
  >
    <record-empty-state
      v-if="emptyStateTitle"
      :title="emptyStateTitle"
    />
    <pet-bubble-page-header
      title="粉碎记录"
      @back="showBubble('actions')"
    />
    <div class="shred-records-toolbar">
      <a-input-search
        v-model="pathKeyword"
        class="shred-records-search"
        allow-clear
        placeholder="筛选文件路径"
      />
      <div class="shred-records-actions">
        <div class="shred-records-summary-group">
          <span class="shred-records-summary">
            共
            <span class="shred-records-summary-total">
              {{ logs.length }}
            </span>
            条
          </span>
          <span class="shred-records-summary">
            ，已选
            <span class="shred-records-summary-selected">
              {{ selectedLogIds.length }}
            </span>
            条
          </span>
        </div>
        <a-popconfirm
          :content="`确定删除选中的 ${selectedLogIds.length} 条粉碎记录吗？`"
          :disabled="selectedLogIds.length === 0"
          :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
          :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
          content-class="shred-records-popconfirm"
          type="error"
          position="br"
          @ok="deleteSelectedLogs"
        >
          <a-button
            class="shred-records-delete"
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
    </div>
    <a-table
      v-model:selected-keys="selectedLogIds"
      class="shred-records-table"
      :data="pagedLogs"
      :pagination="false"
      :row-selection="{ type: 'checkbox', showCheckedAll: true }"
      :scroll="{ y: '100%' }"
      :bordered="{
        wrapper: false,
      }"
      row-key="id"
      stripe
    >
      <template #columns>
        <a-table-column
          v-for="column in RECORD_TABLE_COLUMNS"
          :key="column.key"
          :title="column.title"
          :data-index="column.dataIndex"
          :width="column.width"
          :ellipsis="column.ellipsis"
          :tooltip="column.tooltip"
        >
          <template
            v-if="column.cellType === 'target'"
            #cell="{ record }"
          >
            <record-target-cell
              :path="record.path"
              :icon-name="record.targetIconName"
              :name="record.displayName"
            />
          </template>
          <template
            v-else-if="column.cellType === 'status'"
            #cell="{ record }"
          >
            <record-status-cell
              :message="record.message"
              :status-class="record.statusClass"
              :status-label="record.statusLabel"
            />
          </template>
        </a-table-column>
      </template>
    </a-table>
    <div class="shred-records-pagination">
      <a-pagination
        :current="currentPage"
        :page-size="pageSize"
        :page-size-options="RECORD_PAGE_SIZE_OPTIONS"
        :total="filteredLogs.length"
        show-jumper
        show-page-size
        @change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      />
    </div>
  </a-spin>
</template>
<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import { RecordTableRow } from './type';
import { ShredLog } from '@/type';
import { usePetViewContext } from '@/components/pet-view/hooks';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/pet-view/component/pet-bubble/constants';
import { formatRecordTime, getPathDirectory, getPathName } from '@/utils';
import {
  DEFAULT_RECORD_PAGE_SIZE,
  RECORD_PAGE_SIZE_OPTIONS,
  RECORD_TABLE_COLUMNS,
} from './constants';
import {
  RecordEmptyState,
  RecordStatusCell,
  RecordTargetCell,
} from './component';
import { PetBubblePageHeader } from '../pet-bubble-page-header';
// 保存当前加载的粉碎记录。
const logs = ref<RecordTableRow[]>([]);
// 保存用户跨分页选中的记录标识。
const selectedLogIds = ref<string[]>([]);
// 保存文件路径筛选关键字。
const pathKeyword = ref('');
// 保存当前分页页码。
const currentPage = ref(1);
// 保存当前分页每页展示数量。
const pageSize = ref(DEFAULT_RECORD_PAGE_SIZE);
// 标识记录列表是否正在加载。
const isLoading = ref(true);
// 收集组件销毁时需要执行的事件清理器。
const disposers: Array<() => void> = [];
// 读取气泡页面导航能力。
const { showBubble } = usePetViewContext().inject();
// 按路径关键字筛选当前可见的粉碎记录。
const filteredLogs = computed(() => {
  // 生成忽略大小写与首尾空白的搜索条件。
  const normalizedKeyword = pathKeyword.value.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return logs.value;
  // 保留路径中包含搜索关键字的记录。
  return logs.value.filter((log) =>
    log.path.toLocaleLowerCase().includes(normalizedKeyword),
  );
});
// 根据记录总量与筛选结果生成当前空状态文案。
const emptyStateTitle = computed(() => {
  if (!logs.value.length) return '暂无粉碎记录';
  return filteredLogs.value.length ? '' : '未找到匹配的粉碎记录';
});
// 计算筛选结果对应的总页数，并确保空数据也存在第一页。
const pageCount = computed(() =>
  Math.max(Math.ceil(filteredLogs.value.length / pageSize.value), 1),
);
// 截取当前页需要交给表格渲染的记录。
const pagedLogs = computed(() => {
  // 计算当前页在筛选结果中的起始下标。
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return filteredLogs.value.slice(startIndex, startIndex + pageSize.value);
});
// 从主进程重新读取粉碎记录。
async function refreshLogs(): Promise<void> {
  logs.value = formatLogRows(await window.shredderApi.getLogs());
  isLoading.value = false;
}
// 将原始粉碎记录转换为表格展示所需的派生字段。
function formatLogRows(records: ShredLog[]): RecordTableRow[] {
  return records.map((record) => ({
    ...record,
    displayName: getPathName(record.path),
    sourcePath: getPathDirectory(record.path) || '当前目录',
    statusClass: record.success
      ? 'record-status-cell-success'
      : 'record-status-cell-failure',
    statusLabel: record.success ? '成功' : '失败',
    targetIconName:
      record.targetType === 'directory' ? 'app-folder' : 'app-file',
    timestamp: formatRecordTime(record.timestamp),
  }));
}
// 删除指定粉碎记录并同步表格数据。
async function deleteLogs(ids: string[]): Promise<void> {
  try {
    logs.value = formatLogRows(await window.shredderApi.deleteLogs(ids));
    Message.success(`已删除 ${ids.length} 条粉碎记录`);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}
// 删除用户当前选中的全部粉碎记录。
async function deleteSelectedLogs(): Promise<void> {
  // 复制当前选择，避免确认浮层关闭期间的响应式变化影响本次删除目标。
  await deleteLogs([...selectedLogIds.value]);
}
// 切换至用户指定的分页页码。
function handlePageChange(page: number): void {
  currentPage.value = page;
}
// 应用新的每页数量，并回到筛选结果的第一页。
function handlePageSizeChange(size: number): void {
  pageSize.value = size;
  currentPage.value = 1;
}
// 筛选条件变化时清空选择并回到第一页。
function resetSelectionForFilter(): void {
  selectedLogIds.value = [];
  currentPage.value = 1;
}
// 数据变更后移除失效选择，并修正超出范围的页码。
function reconcileRecordState(currentLogs: RecordTableRow[]): void {
  // 汇总当前仍然存在的记录标识。
  const existingIds = new Set(currentLogs.map((log) => log.id));
  // 保留仍然存在于最新记录列表中的选择项。
  selectedLogIds.value = selectedLogIds.value.filter((id) =>
    existingIds.has(id),
  );
  if (currentPage.value > pageCount.value) currentPage.value = pageCount.value;
}
// 监听筛选条件，避免批量操作包含当前不可见的记录。
watch(pathKeyword, resetSelectionForFilter);
// 监听记录数据，保持选择状态与分页页码有效。
watch(logs, reconcileRecordState);
// 组件挂载后加载记录并订阅跨窗口更新事件。
onMounted(async () => {
  await refreshLogs();
  disposers.push(window.shredderApi.onLogsUpdated(refreshLogs));
});
// 组件销毁前解除全部记录更新监听。
onBeforeUnmount(() => {
  // 依次执行已注册的记录更新清理器。
  disposers.forEach((dispose) => dispose());
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
