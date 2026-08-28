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
      <pet-bubble-result v-else />
    </aside>
  </transition>
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
const props = withDefaults(
  defineProps<{
    gap?: number;
  }>(),
  {
    gap: 8,
  },
);
const { bubbleElement, bubbleMode, bubblePlacement } =
  usePetViewContext().inject();
const bubbleClasses = computed(() => [
  `pet-view-bubble-${bubblePlacement.value}`,
  `pet-view-bubble-${bubbleMode.value}`,
]);
const bubbleStyle = computed(() => ({
  '--pet-bubble-gap': `${props.gap}px`,
}));
</script>

<style lang="less" scoped>
@import './index.less';
</style>
