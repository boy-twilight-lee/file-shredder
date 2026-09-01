<template>
  <main class="pet-bubble-records">
    <page-header
      title="粉碎记录"
      @back="showBubble('actions')"
    />
    <a-spin
      :loading="isLoading"
      class="pet-bubble-records-content"
    >
      <section class="pet-bubble-records-panel">
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
          <a-link
            class="pet-bubble-records-select-all"
            :disabled="filteredLogs.length === 0"
            @click="toggleAllFilteredLogs"
          >
            <svg-icon
              class="pet-bubble-records-select-all-icon"
              :name="selectAllIconName"
            />
            {{ selectAllButtonLabel }}
          </a-link>
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
              class="pet-bubble-records-delete"
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
        <a-checkbox-group
          v-model="selectedLogIds"
          class="pet-bubble-records-selection"
        >
          <a-scrollbar
            ref="recordsScrollbar"
            class="pet-bubble-records-scrollbar-container"
            outer-class="pet-bubble-records-scrollbar"
            outer-style="height: 100%"
            disable-horizontal
            @scroll="handleListScroll"
          >
            <div
              v-if="filteredLogs.length > 0"
              class="pet-bubble-records-list"
              :style="virtualListStyle"
            >
              <div
                class="pet-bubble-records-list-content"
                :style="virtualListContentStyle"
              >
                <article
                  v-for="record in visibleLogs"
                  :key="record.id"
                  class="pet-bubble-records-item"
                  :class="{
                    'pet-bubble-records-item-selected': isLogSelected(
                      record.id,
                    ),
                  }"
                  @click="toggleLogSelection(record.id)"
                >
                  <div class="pet-bubble-records-item-heading">
                    <record-path-cell :record="record">
                      <template #meta>
                        <record-status-cell :record="record" />
                        <record-result-cell :record="record" />
                      </template>
                    </record-path-cell>
                    <a-checkbox
                      class="pet-bubble-records-checkbox"
                      :value="record.id"
                      :aria-label="`选择 ${record.path}`"
                      @click.stop
                    />
                  </div>
                  <div class="pet-bubble-records-item-info">
                    <time class="pet-bubble-records-time">{{
                      record.timestamp
                    }}</time>
                    <a-divider
                      class="pet-bubble-records-info-divider"
                      direction="vertical"
                    />
                    <span
                      class="pet-bubble-records-source"
                      :title="getRecordSourcePath(record.path)"
                    >
                      <span class="pet-bubble-records-source-label"
                        >来自：</span
                      >
                      <span class="pet-bubble-records-source-path">{{
                        getRecordSourcePath(record.path)
                      }}</span>
                    </span>
                  </div>
                </article>
              </div>
            </div>
            <div
              v-else
              class="pet-bubble-records-empty"
            >
              <img
                :src="emptyIllustration"
                alt=""
              />
              <span>{{ emptyStateTitle }}</span>
            </div>
          </a-scrollbar>
        </a-checkbox-group>
      </section>
    </a-spin>
  </main>
</template>
<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import Scrollbar from '@arco-design/web-vue/es/scrollbar';
import { ShredLog } from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
import { formatRecordTime, getPathDirectory } from '@/utils';
import { usePetViewContext } from '@/components/pet-view/hooks';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/pet-view/component/pet-bubble/constants';
import { PageHeader } from '@/components/pet-view/component/pet-bubble-settings/component';
import {
  RecordPathCell,
  RecordResultCell,
  RecordStatusCell,
} from './component';
// 保存当前加载的粉碎记录。
const logs = ref<ShredLog[]>([]);
// 保存用户在列表中选中的记录标识。
const selectedLogIds = ref<string[]>([]);
// 保存文件路径搜索关键字。
const pathKeyword = ref('');
// 标识记录列表是否正在加载。
const isLoading = ref(true);
// 保存记录滚动条实例，用于筛选后回到列表顶部。
const recordsScrollbar = ref<InstanceType<typeof Scrollbar> | null>(null);
// 保存记录列表当前的垂直滚动距离。
const listScrollTop = ref(0);
// 收集组件销毁时需要执行的事件清理器。
const disposers: Array<() => void> = [];
// 定义记录卡片在每个虚拟行中的固定列数。
const RECORD_COLUMN_COUNT = 2;
// 定义包含卡片间距的单个虚拟行固定高度。
const RECORD_ROW_SIZE = 116;
// 定义虚拟行之间的固定间距。
const RECORD_ROW_GAP = 10;
// 定义记录列表实际可见区域高度。
const RECORD_LIST_VIEWPORT_HEIGHT = 452;
// 定义虚拟列表在视口上下保留的缓冲记录数量。
const RECORD_LIST_BUFFER = 4;
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
// 根据数据与搜索结果生成空状态文案。
const emptyStateTitle = computed(() =>
  logs.value.length === 0 ? '暂无粉碎记录' : '未找到匹配的粉碎记录',
);
// 判断当前筛选结果是否已经全部选中。
const areAllFilteredLogsSelected = computed(
  () =>
    filteredLogs.value.length > 0 &&
    filteredLogs.value.every((log) => selectedLogIds.value.includes(log.id)),
);
// 根据当前全选状态生成工具栏按钮文案。
const selectAllButtonLabel = computed(() =>
  areAllFilteredLogsSelected.value ? '取消全选' : '全选',
);
// 根据当前全选状态选择对应的操作图标。
const selectAllIconName = computed(() =>
  areAllFilteredLogsSelected.value ? 'app-close' : 'app-check',
);
// 根据滚动位置计算当前虚拟列表的首行索引。
const visibleRowStartIndex = computed(() =>
  Math.max(
    Math.floor(listScrollTop.value / RECORD_ROW_SIZE) - RECORD_LIST_BUFFER,
    0,
  ),
);
// 计算一个视口连同上下缓冲区需要挂载的虚拟行数量。
const visibleRowCount =
  Math.ceil(RECORD_LIST_VIEWPORT_HEIGHT / RECORD_ROW_SIZE) +
  RECORD_LIST_BUFFER * 2;
// 截取当前视口附近需要实际渲染的粉碎记录。
const visibleLogs = computed(() =>
  filteredLogs.value.slice(
    visibleRowStartIndex.value * RECORD_COLUMN_COUNT,
    (visibleRowStartIndex.value + visibleRowCount) * RECORD_COLUMN_COUNT,
  ),
);
// 生成虚拟列表完整滚动高度，末项不保留额外间距。
const virtualListStyle = computed(() => {
  // 计算两列布局实际占用的虚拟行数。
  const rowCount = Math.ceil(filteredLogs.value.length / RECORD_COLUMN_COUNT);
  return {
    height: `${Math.max(rowCount * RECORD_ROW_SIZE - RECORD_ROW_GAP, 0)}px`,
  };
});
// 根据首个可见行索引定位实际渲染的卡片容器。
const virtualListContentStyle = computed(() => ({
  transform: `translateY(${visibleRowStartIndex.value * RECORD_ROW_SIZE}px)`,
}));
// 从主进程重新读取粉碎记录。
async function refreshLogs(): Promise<void> {
  logs.value = formatLogTimestamps(await window.shredderApi.getLogs());
  isLoading.value = false;
}
// 将粉碎记录时间转换为列表直接展示的文本。
function formatLogTimestamps(records: ShredLog[]): ShredLog[] {
  // 保留原始业务字段，仅将时间替换为列表展示格式。
  return records.map((record) => ({
    ...record,
    timestamp: formatRecordTime(record.timestamp),
  }));
}
// 删除指定粉碎记录并同步列表状态。
async function deleteLogs(ids: string[]): Promise<void> {
  try {
    logs.value = formatLogTimestamps(await window.shredderApi.deleteLogs(ids));
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
// 判断指定记录是否处于选中状态。
function isLogSelected(id: string): boolean {
  return selectedLogIds.value.includes(id);
}
// 切换用户点击记录的选择状态。
function toggleLogSelection(id: string): void {
  // 查找记录在当前选择集合中的位置。
  const selectedIndex = selectedLogIds.value.indexOf(id);
  if (selectedIndex >= 0) selectedLogIds.value.splice(selectedIndex, 1);
  else selectedLogIds.value.push(id);
}
// 全选或取消选择当前筛选结果中的全部记录。
function toggleAllFilteredLogs(): void {
  if (areAllFilteredLogsSelected.value) {
    selectedLogIds.value = [];
    return;
  }
  // 收集当前筛选结果中的全部记录标识。
  selectedLogIds.value = filteredLogs.value.map((log) => log.id);
}
// 获取粉碎目标所属路径，并为无父级路径的记录提供可读文案。
function getRecordSourcePath(path: string): string {
  return getPathDirectory(path) || '当前目录';
}
// 同步 Arco 滚动容器的位置并驱动虚拟列表更新。
function handleListScroll(event: Event): void {
  // 读取触发滚动事件的 Arco Scrollbar 内容容器。
  const scrollContainer = event.target as HTMLElement;
  listScrollTop.value = scrollContainer.scrollTop;
}
// 搜索条件变化时清空可能已经不可见的选择项。
watch(pathKeyword, async () => {
  // 过滤条件变化后清空选择，避免批量操作包含当前不可见的记录。
  selectedLogIds.value = [];
  listScrollTop.value = 0;
  await nextTick();
  recordsScrollbar.value?.scrollTop(0);
});
// 记录列表变化时移除已经不存在的选择项。
watch(logs, (currentLogs) => {
  // 汇总当前仍然存在的记录标识。
  const existingIds = new Set(currentLogs.map((log) => log.id));
  // 保留仍然存在于最新记录列表中的选择项。
  selectedLogIds.value = selectedLogIds.value.filter((id) =>
    existingIds.has(String(id)),
  );
});
// 组件挂载后加载记录并订阅跨窗口更新事件。
onMounted(async () => {
  await refreshLogs();
  disposers.push(window.shredderApi.onLogsUpdated(refreshLogs));
});
// 组件销毁前解除所有记录更新监听。
onBeforeUnmount(() => {
  // 依次执行已注册的记录更新清理器。
  disposers.forEach((dispose) => dispose());
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
