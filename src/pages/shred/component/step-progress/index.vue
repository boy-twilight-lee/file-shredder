<template>
  <div class="shred-progress">
    <div class="shred-progress-card">
      <div class="shred-progress-header">
        <svg-icon
          class="shred-progress-header-icon"
          name="icon-nav-shred"
          :size="16"
        />
        <span class="shred-progress-title">清理进度</span>
      </div>
      <div class="shred-progress-ring">
        <a-progress
          type="circle"
          :percent="filePercent"
          :width="176"
          :stroke-width="12"
          color="#7666fb"
          track-color="#edf1f7"
        >
          <div class="shred-progress-ring-info">
            <span class="shred-progress-ring-percent">{{ filePercent }}%</span>
            <span class="shred-progress-ring-caption">{{ fileCaption }}</span>
          </div>
        </a-progress>
      </div>
      <div class="shred-progress-stages">
        <span
          v-for="chip in stageChips"
          :key="chip.key"
          :class="['shred-progress-chip', `shred-progress-chip-${chip.state}`]"
        >
          {{ chip.label }}
        </span>
      </div>
      <div class="shred-progress-file">
        <span class="shred-progress-file-status">{{ stageLabel }}</span>
        <div class="shred-progress-file-name">
          <app-file-icon
            class="shred-progress-file-icon"
            :path="currentPath"
            :size="16"
          />
          <span class="shred-progress-file-text">{{ currentName }}</span>
        </div>
        <span class="shred-progress-file-path">{{ currentPath }}</span>
      </div>
      <div class="shred-progress-track">
        <div class="shred-progress-track-header">
          <span class="shred-progress-track-title">当前文件数据覆写</span>
          <span class="shred-progress-track-value">{{ bytePercent }}%</span>
        </div>
        <div class="shred-progress-track-bar">
          <i
            class="shred-progress-track-fill"
            :style="{ width: `${bytePercent}%` }"
          />
        </div>
      </div>
      <div class="shred-progress-metrics">
        <div
          v-for="item in metrics"
          :key="item.label"
          class="shred-progress-metric"
        >
          <span class="shred-progress-metric-value">{{ item.value }}</span>
          <span class="shred-progress-metric-label">{{ item.label }}</span>
        </div>
      </div>
      <a-button
        class="shred-progress-stop"
        type="outline"
        status="danger"
        long
        :disabled="!isRunning"
        @click="handleCancel"
      >
        停止清理
      </a-button>
      <span class="shred-progress-note">
        清理过程中请勿关闭窗口，避免数据损坏
      </span>
    </div>
    <div class="shred-progress-aside">
      <div class="shred-progress-queue">
        <div class="shred-progress-header">
          <span class="shred-progress-title">文件处理队列</span>
          <span class="shred-progress-hint">按处理顺序依次覆写</span>
        </div>
        <div class="shred-progress-queue-body">
          <div class="shred-progress-queue-bar">
            <i
              v-for="(segment, index) in queueSegments"
              :key="`${segment.state}-${index}`"
              class="shred-progress-queue-segment"
              :style="{ background: segment.color }"
            />
          </div>
          <div class="shred-progress-queue-legend">
            <span
              v-for="item in queueLegend"
              :key="item.label"
              class="shred-progress-legend-item"
            >
              <i
                class="shred-progress-legend-dot"
                :style="{ background: item.color }"
              />
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
      <div class="shred-progress-detail">
        <div class="shred-progress-header">
          <span class="shred-progress-title">处理明细</span>
          <span class="shred-progress-hint">{{ detailSummary }}</span>
        </div>
        <div class="shred-progress-detail-body">
          <cx-table
            :data="detailRows"
            :columns="detailColumns"
            row-key="id"
            :show-pagination="false"
            :fixed-right-row="false"
            empty-text="等待处理第一个文件"
          >
            <template #stage="{ row }">
              <a-tag :class="row.stageTagClass">{{ row.stageLabel }}</a-tag>
            </template>
            <template #status="{ row }">
              <a-tag :class="row.statusTagClass">{{ row.statusLabel }}</a-tag>
            </template>
          </cx-table>
        </div>
      </div>
      <div class="shred-progress-rule">
        <div class="shred-progress-header">
          <span class="shred-progress-title">处理阶段</span>
          <span class="shred-progress-hint">清理级别：{{ passesLabel }}</span>
        </div>
        <div class="shred-progress-rule-list">
          <div
            v-for="rule in ruleList"
            :key="rule.key"
            class="shred-progress-rule-item"
          >
            <span class="shred-progress-rule-name">{{ rule.label }}</span>
            <span class="shred-progress-rule-desc">{{ rule.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { TableColumnData } from '@/components';
import {
  SHRED_PASSES_LABELS,
  SHRED_QUEUE_COLORS,
  SHRED_STAGE_DESCRIPTIONS,
  SHRED_STAGE_LABELS,
  SHRED_STAGES,
} from '@/constants';
import { useAppShellContext } from '@/layout';
import {
  formatDuration,
  formatFileSize,
  formatRemaining,
  resolveBytePercent,
  resolveFilePercent,
  resolveFileProgressLabel,
  resolveFileName,
  resolveQueueSegments,
} from '@/utils';
defineOptions({
  name: 'StepProgress',
});
// 读取外壳上下文中的任务进度、明细与取消动作。
const { task } = useAppShellContext().inject();
// 明细表格列定义，宽度按设计稿取值。
const detailColumns: TableColumnData[] = [
  { prop: 'time', label: '时间', width: 88 },
  { prop: 'name', label: '文件' },
  { prop: 'stage', label: '阶段', width: 80 },
  { prop: 'status', label: '状态', width: 64 },
];
// 队列图例的展示项，与队列条分段配色共用同一来源。
const queueLegend = [
  { label: '已完成', color: SHRED_QUEUE_COLORS.completed },
  { label: '处理中', color: SHRED_QUEUE_COLORS.working },
  { label: '待处理', color: SHRED_QUEUE_COLORS.pending },
];
// 任务开始时刻，用于计算已用时。
const startedAt = ref(Date.now());
// 任务已用时的秒数。
const elapsedSeconds = ref(0);
// 每秒刷新一次已用时，保证指标组的实时性。
const elapsedTimer = window.setInterval(() => {
  elapsedSeconds.value = Math.floor((Date.now() - startedAt.value) / 1000);
}, 1000);
// 主进程推送的最新进度。
const progress = computed(() => task.progress.value);
// 当前处理阶段，未收到进度时按覆写数据展示。
const stage = computed(() => progress.value?.stage ?? 'overwriting');
// 当前处理阶段的用户视角文案。
const stageLabel = computed(() => SHRED_STAGE_LABELS[stage.value]);
// 环形进度百分比，取文件级口径。
const filePercent = computed(() => resolveFilePercent(progress.value));
// 环形进度中心的文件级进度文案。
const fileCaption = computed(() => resolveFileProgressLabel(progress.value));
// 当前正在处理的目标路径。
const currentPath = computed(() => progress.value?.path ?? '');
// 当前正在处理的目标名称。
const currentName = computed(() =>
  currentPath.value ? resolveFileName(currentPath.value) : '等待开始',
);
// 当前文件的字节级进度百分比。
const bytePercent = computed(() => resolveBytePercent(progress.value));
// 阶段行只展示覆写数据与销毁文件项两段，进度以主进程上报的真实阶段为准。
const stageChips = computed(() => {
  const currentIndex = SHRED_STAGES.indexOf(stage.value);
  return SHRED_STAGES.slice(0, 2).map((key, index) => ({
    key,
    label: SHRED_STAGE_LABELS[key],
    state:
      index < currentIndex
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'pending',
  }));
});
// 队列条的分段状态分布。
const queueSegments = computed(() =>
  resolveQueueSegments(
    progress.value?.fileIndex ?? 0,
    progress.value?.fileCount ?? 0,
  ),
);
// 指标组展示的已处理大小、预计剩余与已用时。
const metrics = computed(() => [
  {
    label: '已处理',
    value: formatFileSize(progress.value?.completed ?? 0),
  },
  {
    label: '预计剩余',
    value: formatRemaining(progress.value?.estimatedSeconds ?? 0),
  },
  {
    label: '已用时',
    value: formatDuration(elapsedSeconds.value * 1000),
  },
]);
// 明细卡右上角的处理进度文案。
const detailSummary = computed(() => {
  const total = progress.value?.fileCount ?? 0;
  const done = Math.min(progress.value?.fileIndex ?? 0, total);
  return `已处理 ${done} / ${total} 个文件`;
});
// 明细表格行视图模型，补齐阶段与状态的文案及标签样式。
const detailRows = computed(() =>
  task.details.value.map((row) => ({
    id: row.id,
    time: row.time,
    name: resolveFileName(row.path),
    stageLabel: SHRED_STAGE_LABELS[row.stage],
    stageTagClass: row.stage === 'done' ? 'correct' : 'auxiliary',
    statusLabel: row.status === 'done' ? '已完成' : '处理中',
    statusTagClass: row.status === 'done' ? 'correct' : 'auxiliary',
  })),
);
// 处理阶段说明卡的三条规则。
const ruleList = computed(() =>
  SHRED_STAGES.map((key) => ({
    key,
    label: SHRED_STAGE_LABELS[key],
    description: SHRED_STAGE_DESCRIPTIONS[key],
  })),
);
// 本次任务使用的清理级别文案。
const passesLabel = computed(() => SHRED_PASSES_LABELS[task.passes.value]);
// 当前是否仍有正在执行的清理任务。
const isRunning = computed(() => task.running.value);
// 组件卸载时清理已用时计时器。
onUnmounted(() => {
  window.clearInterval(elapsedTimer);
});
// 请求取消当前清理任务，结果由主进程结束事件收尾。
async function handleCancel(): Promise<void> {
  await task.cancelShred();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
