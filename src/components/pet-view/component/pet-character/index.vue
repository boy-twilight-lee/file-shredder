<template>
  <div
    class="pet-character"
    :class="`pet-character-${visualPetState}`"
    @mousedown.left="handleMouseDown"
    @mousedown.right.stop
    @mouseup.left="handleMouseUp"
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
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PET_CHARACTER_DRAG_THRESHOLD } from './constants';

const {
  petState,
  bubbleMode,
  summary,
  petImageSource,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext();
let pointerStart: { x: number; y: number } | null = null;
let hasDragged = false;

const visualPetState = computed(() => {
  if (bubbleMode.value === 'result') {
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  return petState.value === 'success' || petState.value === 'failure'
    ? 'idle'
    : petState.value;
});

function handleMouseDown(event: MouseEvent): void {
  pointerStart = { x: event.screenX, y: event.screenY };
  hasDragged = false;
}

function updateDragState(event: MouseEvent): void {
  if (!pointerStart || hasDragged) return;
  const horizontalDistance = event.screenX - pointerStart.x;
  const verticalDistance = event.screenY - pointerStart.y;
  // 屏幕坐标能反映拖窗的真实位移，client 坐标在拖窗时可能保持不变。
  hasDragged =
    Math.hypot(horizontalDistance, verticalDistance) >
    PET_CHARACTER_DRAG_THRESHOLD;
}

function handleMouseMove(event: MouseEvent): void {
  if ((event.buttons & 1) === 0) return;
  updateDragState(event);
}

function handleMouseUp(event: MouseEvent): void {
  if (!pointerStart) return;
  updateDragState(event);
  const shouldToggleActions = !hasDragged;
  pointerStart = null;
  hasDragged = false;
  if (!shouldToggleActions) return;
  if (bubbleMode.value === 'hidden') openActions();
  else closeBubble();
}

useEventListener(document, 'mousemove', handleMouseMove);
</script>

<style lang="less" scoped>
@import './index.less';
</style>
