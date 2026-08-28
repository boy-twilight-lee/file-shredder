<template>
  <main
    class="pet-view"
    :style="petAppearanceStyle"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <pet-bubble :gap="bubbleGap" />

    <div
      class="pet-view-character"
      :class="`pet-view-character-${visualPetState}`"
      @mousedown.left="handleCharacterMouseDown"
      @mousedown.right.stop
      @mouseup.left="handleCharacterMouseUp"
      @contextmenu.prevent
    >
      <img
        class="pet-view-image"
        :class="`pet-view-image-${visualPetState}`"
        :src="petImageSource"
        alt="桌宠人物"
        draggable="false"
        @load="handlePetImageLoad"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { providePetViewContext } from './hooks';
import { PetBubble } from './component';

withDefaults(
  defineProps<{
    bubbleGap?: number;
  }>(),
  {
    bubbleGap: 14,
  },
);

// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const {
  petState,
  bubbleMode,
  summary,
  petAppearanceStyle,
  petImageSource,
  handleCharacterMouseDown,
  handleCharacterMouseUp,
  handleDrop,
  handleDragEnter,
  handleDragLeave,
  handlePetImageLoad,
} = providePetViewContext();

// 结果状态由气泡生命周期控制，关闭气泡后立即停止成功或失败波纹。
const visualPetState = computed(() => {
  if (bubbleMode.value === 'result') {
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  return petState.value === 'success' || petState.value === 'failure'
    ? 'idle'
    : petState.value;
});
</script>

<style lang="less" scoped>
@import './index.less';
</style>
