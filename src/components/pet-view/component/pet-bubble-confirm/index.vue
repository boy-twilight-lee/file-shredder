<template>
  <section class="pet-bubble-confirm">
    <header class="pet-bubble-confirm-heading">
      <span class="pet-bubble-confirm-heading-content">
        <strong>确定永久粉碎吗？</strong>
        <small>
          共 {{ selectedTargets.length }} 项，此操作<span>不可撤销</span>。
        </small>
      </span>
    </header>
    <a-scrollbar
      class="pet-bubble-confirm-scrollbar-container"
      outer-class="pet-bubble-confirm-scrollbar"
      outer-style="max-height: 366px"
      disable-horizontal
    >
      <div class="pet-bubble-confirm-target-list">
        <div
          v-for="target in selectedTargets"
          :key="target.path"
          class="pet-bubble-confirm-target-card"
        >
          <span
            class="pet-bubble-confirm-target-icon-wrap"
            :class="`pet-bubble-confirm-target-icon-wrap-${target.targetType}`"
          >
            <component
              :is="target.targetType === 'directory' ? IconFolder : IconFile"
              class="pet-bubble-confirm-target-icon"
            />
          </span>
          <span class="pet-bubble-confirm-target-content">
            <strong
              class="pet-bubble-confirm-target-path"
              :title="target.path"
            >
              {{ getPathName(target.path) }}
            </strong>
            <small>{{
              target.size === null ? '未知' : formatByteSize(target.size)
            }}</small>
          </span>
          <a-button
            class="pet-bubble-confirm-target-remove"
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
    <div class="pet-bubble-confirm-warning">
      <icon-exclamation-circle-fill />
      <span>粉碎后将无法找回，请确认文件已备份。</span>
    </div>
    <footer class="pet-bubble-confirm-footer">
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
    </footer>
  </section>
</template>

<script setup lang="ts">
import {
  IconExclamationCircleFill,
  IconFile,
  IconFolder,
} from '@arco-design/web-vue/es/icon';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { formatByteSize, getPathName } from '@/utils';

const {
  selectedTargets,
  isSubmitting,
  removeTarget,
  closeBubble,
  confirmShred,
} = usePetViewContext().inject();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
