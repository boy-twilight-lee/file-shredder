<template>
  <div class="shred-progress">
    <div class="shred-progress-heading">
      <span class="shred-progress-title">正在粉碎，请稍候…</span>
      <a-link
        class="shred-progress-cancel"
        status="danger"
        :loading="isCancelling"
        @click="cancelShred"
      >
        <svg-icon name="app-stop" />
        {{ isCancelling ? '正在终止' : '取消删除' }}
      </a-link>
    </div>
    <div
      class="shred-progress-panel"
      :class="`shred-progress-panel-${progressStage.stage}`"
    >
      <div class="shred-progress-summary">
        <span class="shred-progress-status">
          <span class="shred-progress-status-icon">
            <svg-icon name="app-delete" />
          </span>
          <span class="shred-progress-status-label">正在安全删除</span>
        </span>
        <span class="shred-progress-count">
          <span class="shred-progress-count-current">
            {{ displayedFileIndex }}
          </span>
          <span>/ {{ progress?.fileCount ?? 1 }} 个文件</span>
        </span>
      </div>
      <div
        class="shred-progress-current-file"
        :title="progress?.path"
      >
        <span class="shred-progress-file-icon">
          <svg-icon name="app-file" />
        </span>
        <span class="shred-progress-file-name">
          {{ currentFileName }}
        </span>
      </div>
      <div
        class="shred-progress-track"
        role="progressbar"
        aria-label="整体删除进度"
        :aria-valuenow="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="shred-progress-bar"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="shred-progress-meta">
        <span>总体进度</span>
        <span class="shred-progress-percent">{{ progressPercent }}%</span>
      </div>
      <div class="shred-progress-security">
        <svg-icon
          class="shred-progress-security-icon"
          name="app-shield"
        />
        <span>安全粉碎 · 后台执行中</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import { getPathName } from '@/utils';
import { PROGRESS_STAGE_OPTIONS } from './constants';
// 读取粉碎进度及任务取消能力。
const {
  progress,
  progressPercent,
  displayedFileIndex,
  isCancelling,
  cancelShred,
} = usePetViewContext().inject();
// 根据总体进度选择对应的任务阶段。
const progressStage = computed(
  () =>
    PROGRESS_STAGE_OPTIONS.find(
      (item) => progressPercent.value <= item.maximum,
    ) ?? PROGRESS_STAGE_OPTIONS[PROGRESS_STAGE_OPTIONS.length - 1],
);
// 提取当前处理目标的文件名用于进度展示。
const currentFileName = computed(() =>
  progress.value?.path ? getPathName(progress.value.path) : '正在准备目标',
);
</script>
<style lang="less" scoped>
@import './index.less';
</style>
