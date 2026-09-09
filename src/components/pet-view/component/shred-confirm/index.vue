<template>
  <div class="shred-confirm">
    <div class="shred-confirm-heading">
      <span class="shred-confirm-title">确定永久粉碎吗？</span>
      <span class="shred-confirm-description">
        共 {{ selectedTargets.length }} 项，此操作
        <span class="shred-confirm-emphasis">不可撤销</span>。
      </span>
    </div>
    <a-scrollbar
      class="shred-confirm-scroll-container"
      outer-class="shred-confirm-scrollbar"
      outer-style="max-height: 366px"
      disable-horizontal
    >
      <div class="shred-confirm-target-list">
        <div
          v-for="target in selectedTargets"
          :key="target.path"
          class="shred-confirm-target-card"
        >
          <span
            class="shred-confirm-target-icon"
            :class="`shred-confirm-target-${target.targetType}`"
          >
            <svg-icon
              :name="getTargetIconName(target)"
              class="shred-confirm-target-symbol"
            />
          </span>
          <span class="shred-confirm-target-content">
            <span
              class="shred-confirm-target-path"
              :title="target.path"
            >
              {{ getPathName(target.path) }}
            </span>
            <span class="shred-confirm-target-size">
              {{ getTargetSizeText(target) }}
            </span>
          </span>
          <a-button
            class="shred-confirm-target-remove"
            type="text"
            size="small"
            status="danger"
            title="移除"
            :aria-label="`移除 ${target.path}`"
            @click.stop="removeTarget(target.path)"
          >
            <template #icon>
              <svg-icon
                class="shred-confirm-remove-symbol"
                name="app-delete"
              />
            </template>
          </a-button>
        </div>
      </div>
    </a-scrollbar>
    <div class="shred-confirm-warning">
      <svg-icon
        class="shred-confirm-warning-icon"
        name="app-warning"
      />
      <span>粉碎后将无法找回，请确认文件已备份。</span>
    </div>
    <div class="shred-confirm-footer">
      <a-button
        type="outline"
        size="small"
        @click="closeBubble"
      >
        取消
      </a-button>
      <a-button
        type="primary"
        size="small"
        :loading="isSubmitting"
        @click="confirmShred"
      >
        确定
      </a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ShredTarget } from '@/type';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { formatByteSize, getPathName } from '@/utils';
// 读取待确认目标与粉碎任务控制能力。
const {
  selectedTargets,
  isSubmitting,
  removeTarget,
  closeBubble,
  confirmShred,
} = usePetViewContext().inject();
// 返回粉碎目标类型对应的业务图标名称。
function getTargetIconName(target: ShredTarget): string {
  return target.targetType === 'directory' ? 'app-folder' : 'app-file';
}
// 将粉碎目标大小转换为确认列表展示文本。
function getTargetSizeText(target: ShredTarget): string {
  return target.size === null ? '未知' : formatByteSize(target.size);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
