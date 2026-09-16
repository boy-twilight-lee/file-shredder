<template>
  <div
    class="pet-view"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <a-trigger
      :popup-visible="bubbleVisible"
      :click-to-close="false"
      :prevent-focus="false"
      :auto-fit-position="false"
      :show-arrow="false"
      animation-name="fade-in"
      :position="bubbleTriggerPosition"
      content-class="pet-view-trigger"
      trigger="click"
      @popup-visible-change="handleBubbleVisibleChange"
    >
      <pet-character
        :pet-width="petDisplaySize.width"
        :pet-height="petDisplaySize.height"
        :drag-button-visible="bubbleVisible"
      />
      <template #content>
        <pet-bubble />
      </template>
    </a-trigger>
  </div>
</template>
<script setup lang="ts">
import { TriggerPosition } from '@arco-design/web-vue';
import { usePetViewContext } from './hooks';
import { PetBubble, PetCharacter } from './component';
// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const {
  petDisplaySize,
  bubbleMode,
  bubbleDirection,
  bubbleAlign,
  closeBubble,
  handleDrop,
} = usePetViewContext().provide();
// 标识受控气泡当前是否需要显示。
const bubbleVisible = computed(() => bubbleMode.value !== 'hidden');
// 将气泡方位与对齐方式映射为浮层定位值，与主进程的窗口内布局保持一致。
const bubbleTriggerPosition = computed<TriggerPosition>(() => {
  if (bubbleDirection.value === 'right') {
    if (bubbleAlign.value === 'top') return 'rt';
    if (bubbleAlign.value === 'bottom') return 'rb';
    return 'right';
  }
  if (bubbleAlign.value === 'top') return 'lt';
  if (bubbleAlign.value === 'bottom') return 'lb';
  return 'left';
});
// 在组件库检测到外部交互时关闭业务气泡。
function handleBubbleVisibleChange(visible: boolean): void {
  if (!visible) closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
