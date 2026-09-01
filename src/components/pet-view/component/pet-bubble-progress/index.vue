<template>
  <section class="pet-bubble-progress">
    <header class="pet-bubble-progress-heading">
      <strong>正在粉碎，请稍候…</strong>
      <a-link
        class="pet-bubble-progress-cancel"
        status="danger"
        :loading="isCancelling"
        @click="cancelShred"
      >
        <svg-icon name="app-stop" />
        {{ isCancelling ? '正在终止' : '取消删除' }}
      </a-link>
    </header>
    <div
      class="pet-bubble-progress-panel"
      :class="`pet-bubble-progress-panel-${progressTone.tone}`"
    >
      <div class="pet-bubble-progress-summary">
        <span class="pet-bubble-progress-status">
          <span class="pet-bubble-progress-status-icon">
            <svg-icon name="app-delete" />
          </span>
          <strong>正在安全删除</strong>
        </span>
        <span class="pet-bubble-progress-count">
          <strong>{{ displayedFileIndex }}</strong>
          <span>/ {{ progress?.fileCount ?? 1 }} 个文件</span>
        </span>
      </div>
      <div
        class="pet-bubble-progress-current-file"
        :title="progress?.path"
      >
        <span class="pet-bubble-progress-current-file-icon">
          <svg-icon name="app-file" />
        </span>
        <span class="pet-bubble-progress-current-file-content">
          <strong>{{ currentFileName }}</strong>
        </span>
      </div>
      <div
        class="pet-bubble-progress-track"
        role="progressbar"
        aria-label="整体删除进度"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="pet-bubble-progress-bar"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="pet-bubble-progress-meta">
        <span>总体进度</span>
        <strong>{{ progressPercent }}%</strong>
      </div>
      <div class="pet-bubble-progress-security">
        <svg-icon name="app-shield" />
        <span>安全粉碎 · 后台执行中</span>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import { getPathName } from '@/utils';
import { PROGRESS_TONE_OPTIONS } from './constants';
// 读取粉碎进度及任务取消能力。
const {
  progress,
  progressPercent,
  displayedFileIndex,
  isCancelling,
  cancelShred,
} = usePetViewContext().inject();
// 根据总体进度选择对应的视觉状态。
const progressTone = computed(
  () =>
    PROGRESS_TONE_OPTIONS.find(
      (item) => progressPercent.value <= item.maximum,
    ) ?? PROGRESS_TONE_OPTIONS[PROGRESS_TONE_OPTIONS.length - 1],
);
// 提取当前处理目标的文件名用于进度展示。
const currentFileName = computed(() =>
  progress.value?.path ? getPathName(progress.value.path) : '正在准备目标',
);
</script>
<style lang="less" scoped>
@import './index.less';
</style>
