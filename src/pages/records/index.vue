<template>
  <div class="records-page">
    <record-filter-bar
      @query="handleQuery"
      @reset="handleReset"
      @export="handleExport"
    />
    <div class="records-card">
      <div class="records-table">
        <cx-table
          :data="rows"
          :columns="columns"
          row-key="id"
          :show-pagination="false"
          :fixed-right-row="false"
          :loading="loading"
          empty-text="还没有清理记录"
        >
          <template #result="{ row }">
            <span
              :class="[
                'records-result',
                row.success
                  ? 'records-result-success'
                  : 'records-result-failure',
              ]"
            >
              {{ row.success ? '成功' : '失败' }}
            </span>
          </template>
          <template #message="{ row }">
            <span class="records-message">{{ row.message }}</span>
          </template>
          <template #opera="{ row }">
            <div class="records-opera">
              <a-button
                :class="['records-action', 'records-action-detail']"
                type="text"
                @click="handleOpenDetail(row.id)"
              >
                详情
              </a-button>
              <a-button
                :class="['records-action', 'records-action-delete']"
                type="text"
                @click="handleRequestDelete(row.id)"
              >
                删除
              </a-button>
            </div>
          </template>
        </cx-table>
        <div class="records-footer">
          <span class="records-footer-total">共 {{ total }} 条记录</span>
          <cx-pagination
            :current="current"
            :page-size="pageSize"
            :total="total"
            :sizes="PAGE_SIZES"
            @change="handlePageChange"
            @page-size-change="handlePageSizeChange"
          />
        </div>
      </div>
    </div>
    <record-detail-drawer
      v-model:visible="isDetailVisible"
      :log="activeLog"
      @export="handleExport"
    />
    <a-modal
      v-model:visible="isDeleteVisible"
      :width="420"
      title="删除清理记录"
      ok-text="删除"
      @ok="handleConfirmDelete"
    >
      删除后该记录将无法恢复，是否继续？
    </a-modal>
  </div>
</template>
<script setup lang="ts">
import { Message } from '@arco-design/web-vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { TableColumnData } from '@/components';
import {
  createLogFilter,
  downloadTextFile,
  filterShredLogs,
  formatDate,
  formatDateTime,
  paginateShredLogs,
  resolveErrorMessage,
  resolveFileName,
  serializeShredLogsToCsv,
} from '@/utils';
import { ShredLog, ShredLogFilter } from '@/type';
import RecordDetailDrawer from './component/record-detail-drawer';
import RecordFilterBar from './component/record-filter-bar';
defineOptions({
  name: 'RecordsPage',
});
// 每页条数的可选项。
const PAGE_SIZES = [50, 100, 150, 200];
// 记录表格列定义，结果列固定 56 宽以便与表头对齐。
const columns: TableColumnData[] = [
  { prop: 'time', label: '清理时间', width: 160 },
  { prop: 'name', label: '目标名称' },
  {
    prop: 'result',
    label: '结果',
    width: 56,
    align: 'center',
    className: 'records-cell-result',
  },
  { prop: 'message', label: '说明' },
  { prop: 'opera', label: '操作' },
];
// 从主进程读取到的全部清理记录。
const logs = ref<ShredLog[]>([]);
// 记录是否正在读取，用于表格加载遮罩。
const loading = ref(false);
// 当前生效的筛选条件，仅在点击查询或重置时更新。
const filter = ref<ShredLogFilter>(createLogFilter());
// 当前页码。
const current = ref(1);
// 每页条数。
const pageSize = ref(50);
// 详情抽屉的显示状态。
const isDetailVisible = ref(false);
// 当前在详情抽屉中查看的记录。
const activeLog = ref<ShredLog | null>(null);
// 删除确认弹窗的显示状态。
const isDeleteVisible = ref(false);
// 等待删除确认的记录标识。
const pendingDeleteId = ref('');
// 按筛选条件过滤后的记录。
const filteredLogs = computed(() => filterShredLogs(logs.value, filter.value));
// 过滤后的记录总条数。
const total = computed(() => filteredLogs.value.length);
// 当前页展示的记录。
const pageLogs = computed(() =>
  paginateShredLogs(filteredLogs.value, current.value, pageSize.value),
);
// 记录表格的行视图模型。
const rows = computed(() =>
  pageLogs.value.map((log) => ({
    id: log.id,
    time: formatDateTime(log.timestamp),
    name: resolveFileName(log.path),
    success: log.success,
    message: log.message,
  })),
);
// 从主进程读取全部清理记录，失败时给出提示并保留已有列表。
async function loadLogs(): Promise<void> {
  loading.value = true;
  try {
    logs.value = await window.shredderApi.getLogs();
  } catch (error) {
    Message.error({ content: resolveErrorMessage(error) });
  } finally {
    loading.value = false;
  }
}
// 记录变更时重新拉取列表，加载流程内部已处理异常，无需再次等待。
function handleLogsUpdated(): void {
  loadLogs();
}
// 应用筛选条件并回到第一页。
function handleQuery(next: ShredLogFilter): void {
  filter.value = next;
  current.value = 1;
}
// 重置筛选条件并回到第一页。
function handleReset(): void {
  filter.value = createLogFilter();
  current.value = 1;
}
// 切换页码。
function handlePageChange(page: number): void {
  current.value = page;
}
// 调整每页条数并回到第一页。
function handlePageSizeChange(size: number): void {
  pageSize.value = size;
  current.value = 1;
}
// 打开指定记录的详情抽屉。
function handleOpenDetail(id: string): void {
  activeLog.value = logs.value.find((log) => log.id === id) ?? null;
  isDetailVisible.value = true;
}
// 记录待删除的记录并弹出确认。
function handleRequestDelete(id: string): void {
  pendingDeleteId.value = id;
  isDeleteVisible.value = true;
}
// 确认删除后同步主进程并即时刷新列表。
async function handleConfirmDelete(): Promise<void> {
  if (!pendingDeleteId.value) return;
  try {
    logs.value = await window.shredderApi.deleteLogs([pendingDeleteId.value]);
    // 删除后当前页可能已越界，收敛到最后一个有效页。
    current.value = Math.min(
      current.value,
      Math.max(Math.ceil(total.value / pageSize.value), 1),
    );
  } catch (error) {
    Message.error({ content: resolveErrorMessage(error) });
  } finally {
    pendingDeleteId.value = '';
  }
}
// 导出当前筛选结果为 CSV 文件。
function handleExport(): void {
  if (filteredLogs.value.length === 0) {
    Message.warning({ content: '当前没有可导出的记录' });
    return;
  }
  downloadTextFile(
    `清理记录-${formatDate(new Date())}.csv`,
    serializeShredLogsToCsv(filteredLogs.value),
    'text/csv;charset=utf-8',
  );
}
// 订阅主进程记录变更。
const disposeLogsUpdated = window.shredderApi.onLogsUpdated(handleLogsUpdated);
// 页面挂载后读取一次记录列表。
onMounted(() => {
  loadLogs();
});
// 页面卸载时解除记录变更订阅。
onUnmounted(() => {
  disposeLogsUpdated();
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
