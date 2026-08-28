<template>
  <transition name="pet-bubble">
    <aside
      v-if="bubbleMode !== 'hidden'"
      ref="bubbleElement"
      class="pet-view-bubble"
      :class="bubbleClasses"
      :style="bubbleStyle"
    >
      <pet-bubble-actions v-if="bubbleMode === 'actions'" />
      <pet-bubble-settings v-else-if="bubbleMode === 'settings'" />
      <pet-bubble-records v-else-if="bubbleMode === 'records'" />
      <pet-bubble-confirm v-else-if="bubbleMode === 'confirm'" />
      <pet-bubble-progress v-else-if="bubbleMode === 'progress'" />
      <pet-bubble-result v-else-if="bubbleMode === 'result'" />
      <pet-bubble-drop v-else-if="bubbleMode === 'drop'" />
      <pet-bubble-error v-else />
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import {
  PetBubbleActions,
  PetBubbleConfirm,
  PetBubbleDrop,
  PetBubbleError,
  PetBubbleProgress,
  PetBubbleResult,
} from '@/components/pet-view/component';
// 设置与记录只在用户打开对应气泡时加载，避免桌宠首屏引入管理页面代码。
const PetBubbleSettings = defineAsyncComponent(
  () => import('@/components/pet-view/component/pet-bubble-settings'),
);
const PetBubbleRecords = defineAsyncComponent(
  () => import('@/components/pet-view/component/pet-bubble-records'),
);
const props = withDefaults(
  defineProps<{
    gap?: number;
  }>(),
  {
    gap: 14,
  },
);
const { bubbleElement, bubbleMode, bubblePlacement } = usePetViewContext();
const bubbleClasses = computed(() => [
  `pet-view-bubble-${bubblePlacement.value}`,
  `pet-view-bubble-${bubbleMode.value}`,
]);
const bubbleStyle = computed(() => ({
  '--pet-bubble-gap': `${
    Number.isFinite(props.gap) ? Math.max(0, props.gap) : 14
  }px`,
}));
</script>

<style lang="less" scoped>
@import './index.less';
</style>
