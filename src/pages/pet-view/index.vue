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
      :unmount-on-close="false"
      :show-arrow="false"
      animation-name="fade-in"
      :position="bubbleTriggerPosition"
      :popup-offset="PET_BUBBLE_GAP"
      :popup-style="bubblePopupStyle"
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
import { PET_BUBBLE_GAP } from '@/constants';
import { calculatePetBubbleLayoutInsets } from '@/utils';
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
// 将设置气泡锁定在紧凑布局中心，避免桌宠对齐动画触发 Trigger 重复校正位置。
const bubblePopupStyle = computed<Record<string, string>>(() => {
  // 保存需要覆盖 Trigger 自动定位的设置气泡坐标。
  const style: Record<string, string> = {};
  // 非设置气泡继续使用 Trigger 根据人物锚点计算的位置。
  if (bubbleMode.value !== 'settings') return style;
  // 将紧凑设置布局居中放入 records 使用的最大透明画布区域。
  const layoutInsets = calculatePetBubbleLayoutInsets(
    petDisplaySize.value.height,
  );
  style.top = `${Math.round(layoutInsets.vertical)}px`;
  style.left = `${Math.round(layoutInsets.horizontal + petDisplaySize.value.width + PET_BUBBLE_GAP)}px`;
  return style;
});
// 在组件库检测到外部交互时关闭业务气泡。
function handleBubbleVisibleChange(visible: boolean): void {
  if (!visible) closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
