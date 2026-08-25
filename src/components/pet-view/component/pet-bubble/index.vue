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
          'pet-view-bubble-settings': bubbleMode === 'settings',
        },
      ]"
    >
      <template v-if="bubbleMode === 'actions'">
        <strong class="pet-view-bubble-title">请选择操作</strong>
        <p class="pet-view-bubble-description">
          文件或文件夹也可以直接拖到我身上。
        </p>
        <div
          class="pet-view-actions"
          role="menu"
        >
          <button
            v-for="item in PET_ACTION_OPTIONS"
            :key="item.key"
            class="pet-view-action"
            :class="{ 'pet-view-action-close': item.key === 'close' }"
            type="button"
            role="menuitem"
            @click="handleAction(item.key)"
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

      <settings-view
        v-else-if="bubbleMode === 'settings'"
        @close="showBubble('actions')"
      />

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
          <a-link
            class="pet-view-progress-cancel"
            status="danger"
            :loading="isCancelling"
            @click="cancelShred"
          >
            <icon-stop />{{ isCancelling ? '正在终止' : '取消删除' }}
          </a-link>
        </div>
        <div
          class="pet-view-progress-panel"
          :class="`pet-view-progress-panel-${progressTone.tone}`"
        >
          <div class="pet-view-progress-summary">
            <span><icon-delete />正在安全删除</span>
            <strong
              >{{ displayedFileIndex }} /
              {{ progress?.fileCount ?? 1 }} 个文件</strong
            >
          </div>
          <!-- 当前文件仅展示名称，完整路径通过 title 保留，避免长路径撑高气泡。 -->
          <div
            class="pet-view-progress-current-file"
            :title="progress?.path"
          >
            <icon-file />
            <span>{{
              progress?.path ? getTargetName(progress.path) : '正在准备目标'
            }}</span>
          </div>
          <!-- 横向进度条统一表达整个任务的完成度。 -->
          <div
            class="pet-view-progress-track"
            role="progressbar"
            aria-label="整体删除进度"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
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
      </template>

      <template v-else-if="bubbleMode === 'result'">
        <div class="pet-view-result-title">
          <span class="pet-view-result-title-content">
            <strong>
              {{
                summary?.cancelled
                  ? '删除已取消'
                  : summary?.failed
                    ? '部分元素删除失败'
                    : '删除完成'
              }}
            </strong>
            <small>本次任务结果已汇总</small>
          </span>
        </div>
        <p
          v-if="summary?.cancelled"
          class="pet-view-result-warning"
        >
          已停止后续处理，当前文件可能已经部分覆写。
        </p>
        <!-- 固定三列可避免大批量任务的结果卡片纵向膨胀。 -->
        <div class="pet-view-result-metrics">
          <div
            v-for="metric in resultMetrics"
            :key="metric.key"
            class="pet-view-result-metric"
            :class="[
              `pet-view-result-metric-${metric.tone}`,
              {
                'pet-view-result-metric-muted':
                  metric.key === 'failed' && metric.value === 0,
              },
            ]"
          >
            <span class="pet-view-result-metric-heading">
              <component
                :is="metric.icon"
                class="pet-view-result-metric-icon"
              />
              <small>{{ metric.label }}</small>
            </span>
            <strong :title="String(metric.value)">{{ metric.value }}</strong>
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
  IconClose,
  IconDelete,
  IconFile,
  IconFolder,
  IconPoweroff,
  IconSettings,
  IconStop,
} from '@arco-design/web-vue/es/icon';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import SettingsView from '@/components/settings-view';
import DeleteBinIcon from '../delete-bin-icon.vue';

const actionIcons = {
  file: IconFile,
  directory: IconFolder,
  settings: IconSettings,
  close: IconPoweroff,
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

async function handleAction(
  key: (typeof PET_ACTION_OPTIONS)[number]['key'],
): Promise<void> {
  // 设置在当前气泡内切换，其余操作继续调用系统文件选择器。
  if (key === 'settings') {
    showBubble('settings');
    return;
  }
  if (key === 'close') {
    await window.shredderApi.exitApp();
    return;
  }
  await chooseTargets(key);
}
</script>

<style lang="less" scoped>
@import './style/index.less';
</style>
