<template>
  <div
    ref="characterElement"
    class="pet-character"
    :class="`pet-character-${visualPetState}`"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
  >
    <img
      class="pet-character-image"
      :class="`pet-character-image-${visualPetState}`"
      :src="petImageSource"
      alt="桌宠人物"
      draggable="false"
      @load="handlePetImageLoad"
    />
    <button
      ref="dragButtonElement"
      v-show="isDragButtonVisible"
      class="pet-character-drag-button"
      type="button"
      title="拖动桌宠"
      aria-label="拖动桌宠"
      @click.stop
    >
      <svg-icon
        class="pet-character-drag-icon"
        name="app-drag"
      />
    </button>
  </div>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import { useDragButtonVisibility } from './hooks';
// 读取桌宠共享状态与人物交互能力。
const {
  petState,
  bubbleMode,
  summary,
  petImageSource,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext().inject();
// 保存人物触发区域的真实 DOM。
const characterElement = ref<HTMLElement | null>(null);
// 保存拖拽按钮内容区域的真实 DOM。
const dragButtonElement = ref<HTMLButtonElement | null>(null);
// 按触发区域与内容区域的悬停状态控制拖拽按钮显隐。
const { isDragButtonVisible } = useDragButtonVisibility(
  characterElement,
  dragButtonElement,
);
// 将任务结果与临时状态映射为人物视觉状态。
const visualPetState = computed(() => {
  if (bubbleMode.value === 'result') {
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  return petState.value === 'success' || petState.value === 'failure'
    ? 'idle'
    : petState.value;
});
// 点击人物时切换操作气泡面板。
function handleClick(): void {
  if (bubbleMode.value === 'hidden') openActions();
  else closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
