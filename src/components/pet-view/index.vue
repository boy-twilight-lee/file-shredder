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
      :content-style="petAppearanceStyle"
      position="left"
      content-class="pet-bubble-popover"
      trigger="click"
      auto-fit-position
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

// 人物的 mouseup 负责开关气泡，这里只接收 Arco 的外部点击关闭事件。
function handleBubbleVisibleChange(visible: boolean): void {
  if (!visible) closeBubble();
}
</script>

<style lang="less" scoped>
@import './index.less';
</style>
