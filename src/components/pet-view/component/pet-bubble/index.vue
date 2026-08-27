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
          'pet-view-bubble-actions': bubbleMode === 'actions',
          'pet-view-bubble-confirm': bubbleMode === 'confirm',
          'pet-view-bubble-progress': bubbleMode === 'progress',
          'pet-view-bubble-result': bubbleMode === 'result',
          'pet-view-bubble-settings': bubbleMode === 'settings',
        },
      ]"
    >
      <template v-if="bubbleMode === 'actions'">
        <header class="pet-view-home-header">
          <img
            class="pet-view-home-avatar"
            :src="appIconSource"
            alt="文件粉碎精灵"
          />
          <span class="pet-view-home-heading">
            <strong>文件粉碎精灵</strong>
            <small>安全、彻底地清理文件</small>
          </span>
        </header>
        <div
          class="pet-view-actions"
          role="menu"
        >
          <button
            v-for="item in PET_ACTION_OPTIONS"
            :key="item.key"
            class="pet-view-action"
            :class="`pet-view-action-${item.tone}`"
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
              <span class="pet-view-action-heading">
                <strong>{{ item.title }}</strong>
                <small class="pet-view-action-badge">{{ item.badge }}</small>
              </span>
              <small>{{ item.description }}</small>
            </span>
            <icon-right class="pet-view-action-chevron" />
          </button>
        </div>
        <footer class="pet-view-home-tip">
          <span class="pet-view-home-tip-icon"><icon-heart-fill /></span>
          <span>小贴士：文件或文件夹也可以直接拖到我身上。</span>
        </footer>
      </template>

      <settings-view
        v-else-if="bubbleMode === 'settings'"
        @close="showBubble('actions')"
      />

      <template v-else-if="bubbleMode === 'confirm'">
        <header class="pet-view-confirm-heading">
          <span class="pet-view-confirm-heading-content">
            <strong>确定永久粉碎吗？</strong>
            <small>
              共 {{ selectedTargets.length }} 项，此操作<span>不可撤销</span>。
            </small>
          </span>
        </header>
        <a-scrollbar
          class="pet-view-target-scrollbar-container"
          outer-class="pet-view-target-scrollbar"
          outer-style="max-height: 366px"
          disable-horizontal
        >
          <div class="pet-view-target-list">
            <div
              v-for="target in selectedTargets"
              :key="target.path"
              class="pet-view-target-card"
            >
              <span
                class="pet-view-target-icon-wrap"
                :class="`pet-view-target-icon-wrap-${target.targetType}`"
              >
                <component
                  :is="
                    target.targetType === 'directory' ? IconFolder : IconFile
                  "
                  class="pet-view-target-icon"
                />
              </span>
              <span class="pet-view-target-content">
                <strong
                  class="pet-view-target-path"
                  :title="target.path"
                  >{{ getTargetName(target.path) }}</strong
                >
                <small>{{
                  target.size === null ? '未知' : formatFileSize(target.size)
                }}</small>
              </span>
              <a-button
                class="pet-view-target-remove"
                type="text"
                size="small"
                status="danger"
                title="移除"
                :aria-label="`移除 ${target.path}`"
                @click.stop="removeTarget(target.path)"
              >
                <template #icon><icon-delete /></template>
              </a-button>
            </div>
          </div>
        </a-scrollbar>
        <div class="pet-view-confirm-warning">
          <icon-exclamation-circle-fill />
          <span>粉碎后将无法找回，请确认文件已备份。</span>
        </div>
        <div class="pet-view-bubble-footer pet-view-confirm-actions">
          <a-button
            type="outline"
            size="small"
            @click="closeBubble"
            >取消</a-button
          >
          <a-button
            type="primary"
            size="small"
            :loading="isSubmitting"
            @click="confirmShred"
          >
            确定
          </a-button>
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
            <span class="pet-view-progress-status">
              <span class="pet-view-progress-status-icon"><icon-delete /></span>
              <strong>正在安全删除</strong>
            </span>
            <span class="pet-view-progress-count">
              <strong>{{ displayedFileIndex }}</strong>
              <span>/ {{ progress?.fileCount ?? 1 }} 个文件</span>
            </span>
          </div>
          <!-- 当前文件仅展示名称，完整路径通过 title 保留，避免长路径撑高气泡。 -->
          <div
            class="pet-view-progress-current-file"
            :title="progress?.path"
          >
            <span class="pet-view-progress-current-file-icon">
              <icon-file />
            </span>
            <span class="pet-view-progress-current-file-content">
              <strong>{{
                progress?.path ? getTargetName(progress.path) : '正在准备目标'
              }}</strong>
            </span>
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
          <div class="pet-view-progress-security">
            <icon-safe />
            <span>安全粉碎 · 后台执行中</span>
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
              <svg-icon
                class="pet-view-result-metric-icon"
                :name="metric.icon"
              />
              <small>{{ metric.label }}</small>
            </span>
            <strong :title="String(metric.value)">{{ metric.value }}</strong>
            <svg-icon
              class="pet-view-result-metric-background-icon"
              :name="metric.backgroundIcon"
            />
          </div>
        </div>
        <!-- 结果提示根据最终状态提供对应的后续建议。 -->
        <div
          class="pet-view-result-tip"
          :class="
            summary?.cancelled
              ? 'pet-view-result-tip-cancelled'
              : summary?.failed
                ? 'pet-view-result-tip-failure'
                : 'pet-view-result-tip-success'
          "
        >
          <icon-info-circle />
          <span>
            {{
              summary?.cancelled
                ? '任务已停止，当前文件可能已经部分覆写。'
                : summary?.failed
                  ? '失败文件已保留，请检查占用状态后重新尝试。'
                  : '文件已安全粉碎，无法通过常规方式恢复。'
            }}
          </span>
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
  IconExclamationCircleFill,
  IconFile,
  IconFolder,
  IconHeartFill,
  IconInfoCircle,
  IconPoweroff,
  IconRight,
  IconSafe,
  IconSettings,
} from '@arco-design/web-vue/es/icon';
import appIconSource from '@/assets/app-icon.png';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import DeleteBinIcon from '../delete-bin-icon.vue';

// 设置页仅在用户首次打开时加载，减少桌宠首屏脚本的解析与执行量。
const SettingsView = defineAsyncComponent(
  () => import('@/components/settings-view'),
);

const actionIcons = {
  file: IconFile,
  directory: IconFolder,
  settings: IconSettings,
  close: IconPoweroff,
};

function formatFileSize(size: number): string {
  // 仅格式化主进程已返回的字节数，避免渲染列表时再次访问文件系统。
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const {
  bubbleElement,
  bubbleMode,
  bubblePlacement,
  selectedTargets,
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
