<template>
  <section class="pet-bubble-result">
    <header class="pet-bubble-result-title">
      <span class="pet-bubble-result-title-content">
        <strong>{{ resultTitle }}</strong>
        <small>{{ resultSubtitle }}</small>
      </span>
    </header>
    <div class="pet-bubble-result-metrics">
      <div
        v-for="metric in resultMetrics"
        :key="metric.key"
        class="pet-bubble-result-metric"
        :class="metricClasses(metric.key, metric.tone, metric.value)"
      >
        <span class="pet-bubble-result-metric-heading">
          <svg-icon
            class="pet-bubble-result-metric-icon"
            :name="metric.icon"
          />
          <small>{{ metric.label }}</small>
        </span>
        <strong :title="String(metric.value)">{{ metric.value }}</strong>
        <svg-icon
          class="pet-bubble-result-metric-background-icon"
          :name="metric.backgroundIcon"
        />
      </div>
    </div>
    <div
      class="pet-bubble-result-tip"
      :class="`pet-bubble-result-tip-${resultTone}`"
    >
      <svg-icon name="app-information" />
      <span>{{ resultTip }}</span>
    </div>
    <footer class="pet-bubble-result-footer">
      <a-link
        class="pet-bubble-result-link"
        @click="closeBubble"
      >
        我知道了
      </a-link>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import { formatDuration } from '@/utils';
import { RESULT_METRIC_OPTIONS } from './constants';

const { summary, errorMessage, closeBubble } = usePetViewContext().inject();

const hasError = computed(() => Boolean(errorMessage.value));
const formattedDuration = computed(() =>
  formatDuration(summary.value?.durationMs ?? 0),
);
const resultMetrics = computed(() =>
  RESULT_METRIC_OPTIONS.map((item) => ({
    ...item,
    value:
      item.key === 'duration'
        ? formattedDuration.value
        : (summary.value?.[item.key] ?? 0),
  })),
);

const resultTone = computed(() => {
  if (hasError.value) return 'failure';
  if (summary.value?.cancelled) return 'cancelled';
  return summary.value?.failed ? 'failure' : 'success';
});
const resultTitle = computed(() => {
  if (hasError.value) return '删除失败';
  if (summary.value?.cancelled) return '删除已取消';
  return summary.value?.failed ? '部分元素删除失败' : '删除完成';
});
const resultSubtitle = computed(() =>
  hasError.value ? '本次任务未能完成' : '本次任务结果已汇总',
);
const resultTip = computed(() => {
  if (hasError.value) return errorMessage.value;
  if (summary.value?.cancelled) return '任务已停止，当前文件可能已经部分覆写。';
  return summary.value?.failed
    ? '失败文件已保留，请检查占用状态后重新尝试。'
    : '文件已安全粉碎，无法通过常规方式恢复。';
});

function metricClasses(
  key: string,
  tone: string,
  value: string | number,
): string[] {
  const classes = [`pet-bubble-result-metric-${tone}`];
  if (key === 'failed' && value === 0)
    classes.push('pet-bubble-result-metric-muted');
  return classes;
}
</script>

<style lang="less" scoped>
@import './index.less';
</style>
