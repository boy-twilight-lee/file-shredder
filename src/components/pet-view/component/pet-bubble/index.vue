<template>
  <aside
    v-if="bubbleMode !== 'hidden'"
    ref="bubbleElement"
    class="pet-view-bubble"
    :class="`pet-view-bubble-${bubbleMode}`"
  >
    <pet-bubble-actions v-if="bubbleMode === 'actions'" />
    <pet-bubble-settings v-else-if="bubbleMode === 'settings'" />
    <pet-bubble-records v-else-if="bubbleMode === 'records'" />
    <pet-bubble-confirm v-else-if="bubbleMode === 'confirm'" />
    <pet-bubble-progress v-else-if="bubbleMode === 'progress'" />
    <pet-bubble-result v-else />
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
</script>
<style lang="less" scoped>
@import './index.less';
</style>
