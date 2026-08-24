<template>
  <transition name="pet-bubble">
    <aside
      v-if="bubbleMode !== 'hidden'"
      ref="bubbleElement"
      class="pet-view-bubble"
      :class="[
        `pet-view-bubble-${bubblePlacement}`,
        {
          'pet-view-bubble-drop': bubbleMode === 'drop',
          'pet-view-bubble-progress': bubbleMode === 'progress',
        },
      ]"
    >
      <template v-if="bubbleMode === 'actions'">
        <strong class="pet-view-bubble-title">想怎么粉碎？</strong>
        <p class="pet-view-bubble-description">
          也可以直接把文件或文件夹拖到我身上。
        </p>
        <div
          class="pet-view-actions"
          role="menu"
        >
          <button
            v-for="item in PET_ACTION_OPTIONS"
            :key="item.key"
            class="pet-view-action"
            type="button"
            role="menuitem"
            @click="chooseTargets(item.key)"
          >
            <span class="pet-view-action-icon-wrap">
              <component
                :is="actionIcons[item.key]"
                class="pet-view-action-icon"
              />
            </span>
            <span class="pet-view-action-content">
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </button>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'confirm'">
        <strong class="pet-view-bubble-title">确定永久粉碎吗？</strong>
        <p class="pet-view-bubble-description">
          共 {{ selectedPaths.length }} 项，此操作不可撤销。
        </p>
        <a-scrollbar
          class="pet-view-target-scrollbar-container"
          outer-class="pet-view-target-scrollbar"
          outer-style="max-height: 264px"
          disable-horizontal
        >
          <div class="pet-view-target-list">
            <div
              v-for="path in selectedPaths"
              :key="path"
              class="pet-view-target-card"
            >
              <span
                class="pet-view-target-path"
                :title="path"
                >{{ getTargetName(path) }}</span
              >
              <a-button
                class="pet-view-target-remove"
                type="text"
                size="small"
                status="danger"
                title="移除"
                :aria-label="`移除 ${path}`"
                @click.stop="removeTarget(path)"
              >
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
          </div>
        </a-scrollbar>
        <div class="pet-view-bubble-footer pet-view-confirm-actions">
          <a-link
            class="pet-view-confirm-link"
            @click="closeBubble"
            ><icon-close />取消</a-link
          >
          <a-link
            class="pet-view-confirm-link"
            status="danger"
            :loading="isSubmitting"
            @click="confirmShred"
          >
            <icon-delete />粉碎
          </a-link>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'progress'">
        <div class="pet-view-progress-heading">
          <strong class="pet-view-bubble-title">正在粉碎，请稍候…</strong>
          <span class="pet-view-progress-stage">{{ progressStageLabel }}</span>
        </div>
        <div
          class="pet-view-progress-panel"
          :class="`pet-view-progress-panel-${progressTone.tone}`"
        >
          <div class="pet-view-progress-overview">
            <div class="pet-view-progress-circle-wrap">
              <a-progress
                class="pet-view-progress-circle"
                type="circle"
                size="small"
                :color="progressTone.color"
                :percent="progressPercent / 100"
                :show-text="true"
                animation
              />
            </div>
            <div class="pet-view-progress-detail">
              <span><icon-delete />正在安全删除</span>
              <strong
                >{{ displayedFileIndex }} /
                {{ progress?.fileCount ?? 1 }}</strong
              >
              <small>已处理文件数量</small>
            </div>
          </div>
          <div
            class="pet-view-progress-track"
            aria-hidden="true"
          >
            <span
              class="pet-view-progress-bar"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <div class="pet-view-progress-meta">
            <span>总体进度</span>
            <strong>{{ progressPercent }}%</strong>
          </div>
        </div>
        <span
          class="pet-view-progress-path"
          :title="progress?.path"
        >
          {{ progress?.path ?? '正在准备目标' }}
        </span>
        <div class="pet-view-progress-actions">
          <a-link
            status="danger"
            :loading="isCancelling"
            @click="cancelShred"
          >
            <icon-stop />{{ isCancelling ? '正在终止' : '取消删除' }}
          </a-link>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'result'">
        <div
          class="pet-view-result-title"
          :class="{
            'pet-view-result-title-failure': summary?.failed,
            'pet-view-result-title-cancelled': summary?.cancelled,
          }"
        >
          <component
            :is="
              summary?.cancelled
                ? IconStop
                : summary?.failed
                  ? IconCloseCircleFill
                  : IconCheckCircleFill
            "
          />
          <strong>
            {{
              summary?.cancelled
                ? '删除已取消'
                : summary?.failed
                  ? '部分元素删除失败'
                  : '删除完成'
            }}
          </strong>
        </div>
        <p
          v-if="summary?.cancelled"
          class="pet-view-result-warning"
        >
          已停止后续处理，当前文件可能已经部分覆写。
        </p>
        <div class="pet-view-result-metrics">
          <div
            v-for="metric in resultMetrics"
            :key="metric.key"
            class="pet-view-result-metric"
            :class="`pet-view-result-metric-${metric.tone}`"
          >
            <component
              :is="metric.icon"
              class="pet-view-result-metric-icon"
            />
            <span
              ><small>{{ metric.label }}</small
              ><strong>{{ metric.value }}</strong></span
            >
          </div>
        </div>
        <div class="pet-view-result-footer">
          <a-link
            class="pet-view-result-link"
            @click="closeBubble"
            >我知道了</a-link
          >
        </div>
      </template>

      <template v-else-if="bubbleMode === 'drop'">
        <div class="pet-view-drop-hint">
          <delete-bin-icon class="pet-view-drop-icon" />
          <strong>松手删除</strong>
        </div>
      </template>

      <template v-else>
        <strong class="pet-view-bubble-title">暂时无法处理</strong>
        <p class="pet-view-bubble-description">{{ errorMessage }}</p>
        <a-button
          type="primary"
          size="small"
          long
          @click="showBubble('actions')"
          >重新选择</a-button
        >
      </template>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import {
  IconCheckCircleFill,
  IconClose,
  IconCloseCircleFill,
  IconDelete,
  IconFile,
  IconFolder,
  IconStop,
} from '@arco-design/web-vue/es/icon';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import DeleteBinIcon from '../delete-bin-icon.vue';

const actionIcons = {
  file: IconFile,
  directory: IconFolder,
};

const {
  bubbleElement,
  bubbleMode,
  bubblePlacement,
  selectedPaths,
  progress,
  progressPercent,
  displayedFileIndex,
  progressTone,
  progressStageLabel,
  summary,
  resultMetrics,
  errorMessage,
  isSubmitting,
  isCancelling,
  chooseTargets,
  removeTarget,
  getTargetName,
  closeBubble,
  confirmShred,
  cancelShred,
  showBubble,
} = usePetViewContext();
</script>

<style lang="less" scoped>
@import './style/index.less';
</style>
