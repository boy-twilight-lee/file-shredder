<template>
  <div
    :class="['pet-bubble', `shred-${visibleBubbleMode}`]"
    :style="bubbleSizeStyle"
    ref="bubbleElement"
  >
    <transition
      name="pet-bubble-fade"
      mode="out-in"
    >
      <pet-bubble-actions v-if="visibleBubbleMode === 'actions'" />
      <pet-bubble-settings v-else-if="visibleBubbleMode === 'settings'" />
      <pet-bubble-records v-else-if="visibleBubbleMode === 'records'" />
      <pet-bubble-confirm v-else-if="visibleBubbleMode === 'confirm'" />
      <pet-bubble-progress v-else-if="visibleBubbleMode === 'progress'" />
      <pet-bubble-result v-else />
    </transition>
  </div>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/pages/pet-view/hooks';
import { PET_BUBBLE_MAX_SIZE } from '@/constants';
import {
  PetBubbleActions,
  PetBubbleConfirm,
  PetBubbleProgress,
  PetBubbleResult,
  PetBubbleSettings,
  PetBubbleRecords,
} from '@/pages/pet-view/component';
// 读取气泡容器引用与当前业务视图。
const { bubbleElement, bubbleMode } = usePetViewContext().inject();
// 保留最后一个可见业务视图，供 Trigger 完成气泡退场动画。
const visibleBubbleMode = ref(bubbleMode.value);
// 设置与记录页面铺满窗口预留的气泡区域，其余气泡按内容自适应。
const bubbleSizeStyle = computed<Record<string, string>>(() => {
  // 保存固定尺寸气泡需要的内联样式，其余页面保持空对象按内容自适应。
  const style: Record<string, string> = {};
  if (
    visibleBubbleMode.value === 'settings' ||
    visibleBubbleMode.value === 'records'
  ) {
    style.height = `${PET_BUBBLE_MAX_SIZE.height}px`;
    style.width = `${PET_BUBBLE_MAX_SIZE.width}px`;
  }
  return style;
});
// 气泡关闭时保留当前内容，避免淡出阶段提前卸载。
watch(bubbleMode, (mode) => {
  if (mode !== 'hidden') visibleBubbleMode.value = mode;
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
