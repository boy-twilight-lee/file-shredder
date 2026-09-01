<template>
  <main
    class="pet-view"
    :style="petAppearanceStyle"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <a-trigger
      :popup-visible="bubbleVisible"
      :click-to-close="false"
      :prevent-focus="false"
      :auto-fit-position="false"
      :content-style="petAppearanceStyle"
      :show-arrow="false"
      animation-name="fade-in"
      position="left"
      content-class="pet-bubble-trigger"
      trigger="click"
      @popup-visible-change="handleBubbleVisibleChange"
    >
      <pet-character :drag-button-visible="bubbleVisible" />
      <template #content>
        <pet-bubble />
      </template>
    </a-trigger>
  </main>
</template>
<script setup lang="ts">
import { usePetViewContext } from './hooks';
import { PetBubble, PetCharacter } from './component';
// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const { petAppearanceStyle, bubbleMode, closeBubble, handleDrop } =
  usePetViewContext().provide();
// 标识受控气泡当前是否需要显示。
const bubbleVisible = computed(() => bubbleMode.value !== 'hidden');
// 在组件库检测到外部交互时关闭业务气泡。
function handleBubbleVisibleChange(visible: boolean): void {
  if (!visible) closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
