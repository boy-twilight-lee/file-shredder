<template>
  <div class="shred-record-panel">
    <a-input-search
      v-model="pathKeyword"
      class="shred-record-panel-search"
      size="small"
      allow-clear
      placeholder="搜索文件路径"
    />

    <div class="shred-record-panel-toolbar">
      <a-checkbox
        :model-value="isAllFilteredLogsSelected"
        :indeterminate="isPartiallySelected"
        :disabled="filteredLogs.length === 0"
        @change="toggleAllFilteredLogs"
      >
        {{
          selectedLogIds.length > 0
            ? `已选 ${selectedLogIds.length} / 共 ${filteredLogs.length} 条`
            : `共 ${filteredLogs.length} 条`
        }}
      </a-checkbox>
      <a-popconfirm
        :content="`确定删除选中的 ${selectedLogIds.length} 条粉碎记录吗？`"
        content-class="settings-view-popconfirm"
        type="error"
        :disabled="selectedLogIds.length === 0"
        :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
        :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
        @ok="deleteSelectedLogs"
      >
        <a-link
          status="danger"
          :disabled="selectedLogIds.length === 0"
        >
          <icon-delete />删除
        </a-link>
      </a-popconfirm>
    </div>

    <div
      v-if="filteredLogs.length === 0"
      class="shred-record-panel-empty"
    >
      <img
        :src="emptyIllustration"
        alt=""
      />
      <strong>{{ emptyStateTitle }}</strong>
      <span>{{ emptyStateDescription }}</span>
    </div>

    <!-- TanStack 计算可视项，Arco Scrollbar 负责滚动交互与视觉样式。 -->
    <div
      v-else
      ref="listRootElement"
      class="shred-record-panel-list"
    >
      <a-scrollbar
        class="shred-record-panel-scrollbar-container"
        outer-class="shred-record-panel-scrollbar"
        disable-horizontal
      >
        <div
          class="shred-record-panel-list-content"
          :style="{ height: `${virtualListTotalSize}px` }"
        >
          <article
            v-for="item in virtualRows"
            :key="String(item.key)"
            class="shred-record-panel-item"
            :class="{
              'shred-record-panel-item-selected': isSelected(item.data.id),
            }"
            :style="{ transform: `translateY(${item.start}px)` }"
            role="checkbox"
            tabindex="0"
            :aria-checked="isSelected(item.data.id)"
            @click="toggleLog(item.data.id)"
            @keydown.enter.prevent="toggleLog(item.data.id)"
            @keydown.space.prevent="toggleLog(item.data.id)"
          >
            <div class="shred-record-panel-item-heading">
              <a-checkbox
                :model-value="isSelected(item.data.id)"
                :aria-label="`选择 ${item.data.path}`"
                @click.stop
                @keydown.stop
                @change="toggleLog(item.data.id)"
              />
              <strong
                class="shred-record-panel-path"
                :title="item.data.path"
                >{{ item.data.path }}</strong
              >
              <span
                class="shred-record-panel-status"
                :class="
                  item.data.success
                    ? 'shred-record-panel-status-success'
                    : 'shred-record-panel-status-failure'
                "
              >
                <icon-check-circle v-if="item.data.success" />
                <icon-close-circle v-else />
                {{ item.data.success ? '成功' : '失败' }}
              </span>
            </div>
            <div class="shred-record-panel-item-meta">
              <p
                class="shred-record-panel-message"
                :class="{
                  'shred-record-panel-message-muted': item.data.success,
                }"
                :title="getLogMessage(item.data)"
              >
                {{ getLogMessage(item.data) }}
              </p>
              <time>{{ formatLogTime(item.data.timestamp) }}</time>
            </div>
          </article>
        </div>
      </a-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { ShredLog } from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/settings-view/constants';
import { SHRED_RECORD_ITEM_HEIGHT, SHRED_RECORD_OVERSCAN } from './constants';

const props = defineProps<{ logs: ShredLog[] }>();
const emit = defineEmits<{
  'delete-logs': [ids: Array<string | number>];
}>();

const selectedLogIds = ref<string[]>([]);
const pathKeyword = ref('');
const listRootElement = ref<HTMLElement | null>(null);
const scrollElement = ref<HTMLElement | null>(null);
const selectedLogIdSet = computed(() => new Set(selectedLogIds.value));
const filteredLogs = computed(() => {
  const normalizedKeyword = pathKeyword.value.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return props.logs;
  return props.logs.filter((log) =>
    log.path.toLocaleLowerCase().includes(normalizedKeyword),
  );
});
const isAllFilteredLogsSelected = computed(
  () =>
    filteredLogs.value.length > 0 &&
    filteredLogs.value.every((log) => selectedLogIdSet.value.has(log.id)),
);
const isPartiallySelected = computed(() => {
  const selectedCount = filteredLogs.value.filter((log) =>
    selectedLogIdSet.value.has(log.id),
  ).length;
  return selectedCount > 0 && selectedCount < filteredLogs.value.length;
});
const emptyStateTitle = computed(() =>
  props.logs.length === 0 ? '暂无粉碎记录' : '未找到匹配路径',
);
const emptyStateDescription = computed(() =>
  props.logs.length === 0
    ? '完成文件粉碎后，处理结果会显示在这里。'
    : '请尝试输入其他文件路径关键字。',
);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: filteredLogs.value.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => SHRED_RECORD_ITEM_HEIGHT,
    getItemKey: (index: number) => filteredLogs.value[index]?.id ?? index,
    overscan: SHRED_RECORD_OVERSCAN,
  })),
);
const virtualRows = computed(() =>
  rowVirtualizer.value.getVirtualItems().map((item) => ({
    ...item,
    data: filteredLogs.value[item.index],
  })),
);
const virtualListTotalSize = computed(() =>
  rowVirtualizer.value.getTotalSize(),
);

function isSelected(id: string): boolean {
  return selectedLogIdSet.value.has(id);
}

function toggleLog(id: string): void {
  selectedLogIds.value = isSelected(id)
    ? selectedLogIds.value.filter((item) => item !== id)
    : [...selectedLogIds.value, id];
}

function toggleAllFilteredLogs(
  value: boolean | Array<string | number | boolean>,
): void {
  if (Array.isArray(value)) return;
  const filteredIds = filteredLogs.value.map((log) => log.id);
  if (value) {
    selectedLogIds.value = [
      ...new Set([...selectedLogIds.value, ...filteredIds]),
    ];
    return;
  }
  const filteredIdSet = new Set(filteredIds);
  selectedLogIds.value = selectedLogIds.value.filter(
    (id) => !filteredIdSet.has(id),
  );
}

function deleteSelectedLogs(): void {
  // 复制当前选择，避免确认浮层关闭期间的响应式变化影响本次删除目标。
  emit('delete-logs', [...selectedLogIds.value]);
}

function formatLogTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function getLogMessage(log: ShredLog): string {
  if (log.targetType === 'directory' && !log.success)
    return `成功 ${log.succeededCount ?? 0} 个，失败 ${log.failedCount ?? 0} 个`;
  if (log.targetType === 'directory') return '文件夹已安全删除';
  return log.success ? '文件已安全删除' : log.message;
}

watch(listRootElement, async (element) => {
  await nextTick();
  // TanStack 需要监听 Arco 内部的真实滚动容器，而不是组件外层节点。
  scrollElement.value =
    element?.querySelector<HTMLElement>(
      '.shred-record-panel-scrollbar-container',
    ) ?? null;
});

watch(pathKeyword, async () => {
  selectedLogIds.value = [];
  await nextTick();
  rowVirtualizer.value.scrollToOffset(0);
});

watch(
  () => props.logs,
  (logs) => {
    // 删除或外部刷新后清理已不存在的记录，避免批量操作携带失效 ID。
    selectedLogIds.value = selectedLogIds.value.filter((id) =>
      logs.some((log) => log.id === id),
    );
  },
);
</script>

<style lang="less" scoped>
@import './style/index.less';
</style>
