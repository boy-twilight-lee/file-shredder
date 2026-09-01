<template>
  <main
    class="pet-view"
    :style="petAppearanceStyle"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <a-popover
      :popup-visible="bubbleVisible"
      :show-arrow="false"
      :click-to-close="false"
      :prevent-focus="false"
      :auto-fit-position="false"
      :content-style="petAppearanceStyle"
      position="left"
      content-class="pet-bubble-popover"
      arrow-class="pet-bubble-popover-arrow"
      trigger="click"
      @popup-visible-change="handleBubbleVisibleChange"
    >
      <pet-character />
      <template #content>
        <pet-bubble />
      </template>
    </a-popover>
  </main>
</template>

<script setup lang="ts">
import { usePetViewContext } from './hooks';
import { PetBubble, PetCharacter } from './component';

// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const { petAppearanceStyle, bubbleMode, closeBubble, handleDrop } =
  usePetViewContext().provide();
const bubbleVisible = computed(() => bubbleMode.value !== 'hidden');

function handleBubbleVisibleChange(visible: boolean): void {
  if (!visible) closeBubble();
}
</script>

<style lang="less" scoped>
@import './index.less';
</style>
