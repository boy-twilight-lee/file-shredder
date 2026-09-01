<template>
  <aside
    :class="['pet-view-bubble', `pet-view-bubble-${visibleBubbleMode}`]"
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
  </aside>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import {
  PetBubbleActions,
  PetBubbleConfirm,
  PetBubbleProgress,
  PetBubbleResult,
  PetBubbleSettings,
  PetBubbleRecords,
} from '@/components/pet-view/component';
// 读取气泡容器引用与当前业务视图。
const { bubbleElement, bubbleMode } = usePetViewContext().inject();
// 保留最后一个可见业务视图，供 Trigger 完成气泡退场动画。
const visibleBubbleMode = ref(bubbleMode.value);
// 气泡关闭时保留当前内容，避免淡出阶段提前卸载。
watch(bubbleMode, (mode) => {
  if (mode !== 'hidden') visibleBubbleMode.value = mode;
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
