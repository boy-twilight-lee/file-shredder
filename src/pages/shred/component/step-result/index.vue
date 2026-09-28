<template>
  <div class="shred-result">
    <div
      class="shred-result-card"
      :style="{ background: toneStyle.gradient }"
    >
      <div
        class="shred-result-illustration"
        :style="{ background: toneStyle.background }"
      >
        <svg-icon
          :name="content.illustration"
          :size="152"
        />
      </div>
      <span
        class="shred-result-badge"
        :style="{ color: toneStyle.deep, background: toneStyle.background }"
      >
        {{ content.badge }}
      </span>
      <span class="shred-result-title">{{ content.title }}</span>
      <span class="shred-result-description">{{ content.description }}</span>
      <div class="shred-result-divider" />
      <div class="shred-result-meta">
        <span class="shred-result-meta-item">{{ passesLabel }}</span>
        <span class="shred-result-meta-dot" />
        <span class="shred-result-meta-item">耗时 {{ durationLabel }}</span>
      </div>
      <div class="shred-result-actions">
        <a-button
          type="primary"
          long
          @click="handleOpenRecords"
        >
          清理记录
        </a-button>
        <a-button
          type="outline"
          long
          @click="handleFinish"
        >
          完成清理
        </a-button>
      </div>
    </div>
    <div class="shred-result-aside">
      <div class="shred-result-stats">
        <div
          v-for="item in stats"
          :key="item.label"
          class="shred-result-stat"
        >
          <span class="shred-result-stat-value">{{ item.value }}</span>
          <span class="shred-result-stat-label">{{ item.label }}</span>
        </div>
      </div>
      <div class="shred-result-panel">
        <div class="shred-result-panel-header">
          <span class="shred-result-panel-title">清理详情</span>
        </div>
        <div class="shred-result-panel-list">
          <div
            v-for="item in detailList"
            :key="item.label"
            class="shred-result-row"
          >
            <span class="shred-result-row-label">{{ item.label }}</span>
            <span class="shred-result-row-value">{{ item.value }}</span>
          </div>
        </div>
      </div>
      <div class="shred-result-panel shred-result-panel-fill">
        <div class="shred-result-panel-header">
          <span class="shred-result-panel-title">本次目标</span>
          <span class="shred-result-panel-hint">
            共 {{ targetRows.length }} 项
          </span>
        </div>
        <div class="shred-result-targets">
          <div
            v-for="row in targetRows"
            :key="row.id"
            class="shred-result-target"
          >
            <app-file-icon
              class="shred-result-target-icon"
              :path="row.path"
              :target-type="row.targetType"
            />
            <span class="shred-result-target-name">{{ row.name }}</span>
            <a-tag :class="row.success ? 'correct' : 'error'">
              {{ row.success ? '已清除' : '未清除' }}
            </a-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import {
  SHRED_CANCELLED_CONTENT,
  SHRED_PASSES_LABELS,
  SHRED_RESULT_CONTENTS,
  SHRED_RESULT_TONES,
} from '@/constants';
import { useAppShellContext } from '@/layout';
import {
  formatDateTime,
  formatDuration,
  resolveOverwriteLabel,
  resolveTargetOutcomes,
} from '@/utils';
defineOptions({
  name: 'StepResult',
});
// 读取外壳上下文中的任务结果、清理级别与页面切换能力。
const { task, setActivePage } = useAppShellContext().inject();
// 结果页完成时间，进入结果步骤时取一次，避免停留在页面期间持续变化。
const finishedAt = formatDateTime(new Date());
// 任务结束后的汇总结果。
const summary = computed(() => task.summary.value);
// 结果页使用的三态语义色。
const toneStyle = computed(() => SHRED_RESULT_TONES[task.resultTone.value]);
// 结果页展示的插画与文案，取消态覆盖三态文案。
const content = computed(() => {
  if (summary.value?.cancelled) return SHRED_CANCELLED_CONTENT;
  return SHRED_RESULT_CONTENTS[task.resultTone.value];
});
// 本次任务使用的清理级别文案。
const passesLabel = computed(() => SHRED_PASSES_LABELS[task.passes.value]);
// 本次任务的总耗时文案。
const durationLabel = computed(() =>
  formatDuration(summary.value?.durationMs ?? 0),
);
// 统计区四张卡片的数值，总数等于已清除与未清除之和。
const stats = computed(() => {
  const cleared = summary.value?.succeeded ?? 0;
  const uncleared = summary.value?.failed ?? 0;
  return [
    { label: '文件总数', value: String(cleared + uncleared) },
    { label: '已清除', value: String(cleared) },
    { label: '未清除', value: String(uncleared) },
    { label: '本次耗时', value: durationLabel.value },
  ];
});
// 本次参与清理的目标行，按勾选快照取子集并汇总最终状态。
const targetRows = computed(() =>
  resolveTargetOutcomes(
    task.targets.value.filter((target) =>
      task.selectedPaths.value.includes(target.path),
    ),
    task.results.value,
  ),
);
// 清理详情卡的字段列表。
const detailList = computed(() => [
  { label: '清理级别', value: passesLabel.value },
  { label: '目标数量', value: `${targetRows.value.length} 项` },
  { label: '数据覆写', value: resolveOverwriteLabel(task.passes.value) },
  { label: '完成时间', value: finishedAt },
]);
// 跳转到清理记录页查看本次任务的记录。
function handleOpenRecords(): void {
  setActivePage('records');
}
// 结束本次任务并回到拖拽步骤，清空目标草稿。
function handleFinish(): void {
  task.finishShred();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
