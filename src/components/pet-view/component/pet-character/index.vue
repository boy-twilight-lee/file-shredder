<template>
  <div
    class="pet-character"
    :class="`pet-character-${visualPetState}`"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
    @mouseenter="showDragButton"
    @mouseleave="hideDragButton"
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

const DRAG_BUTTON_HOVER_DELAY_MS = 100;

const {
  petState,
  bubbleMode,
  summary,
  petImageSource,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext().inject();
const isDragButtonVisible = ref(false);
let dragButtonVisibilityTimer = 0;

const visualPetState = computed(() => {
  if (bubbleMode.value === 'result') {
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  return petState.value === 'success' || petState.value === 'failure'
    ? 'idle'
    : petState.value;
});

function handleClick(): void {
  if (bubbleMode.value === 'hidden') openActions();
  else closeBubble();
}

function changeDragButtonVisibility(visible: boolean): void {
  if (dragButtonVisibilityTimer) {
    window.clearTimeout(dragButtonVisibilityTimer);
    dragButtonVisibilityTimer = 0;
  }
  if (visible === isDragButtonVisible.value) return;
  dragButtonVisibilityTimer = window.setTimeout(() => {
    isDragButtonVisible.value = visible;
    dragButtonVisibilityTimer = 0;
  }, DRAG_BUTTON_HOVER_DELAY_MS);
}

function showDragButton(): void {
  changeDragButtonVisibility(true);
}

function hideDragButton(): void {
  changeDragButtonVisibility(false);
}

onBeforeUnmount(() => {
  if (dragButtonVisibilityTimer) {
    window.clearTimeout(dragButtonVisibilityTimer);
  }
});
</script>

<style lang="less" scoped>
@import './index.less';
</style>
