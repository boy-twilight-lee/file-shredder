<template>
  <button
    :class="[
      'pet-character-drag',
      { 'pet-character-drag-mirrored': isMirrored },
    ]"
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
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
// 读取气泡相对人物的方位，用于把拖拽按钮镜像到人物另一侧。
const { bubbleDirection } = usePetViewContext().inject();
// 标识拖拽按钮是否需要镜像到人物左上角，避免按钮与右侧气泡相互遮挡。
const isMirrored = computed(() => bubbleDirection.value === 'right');
</script>
<style lang="less" scoped>
.pet-character-drag {
  position: absolute;
  z-index: 3;
  top: 0;
  right: 0;
  pointer-events: auto;
  cursor: move;
  -webkit-app-region: drag;
  height: 36px;
  width: 36px;
  padding: 0;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.88);
  border-radius: 10px;
  box-shadow:
    0 0 0 1px rgba(49, 66, 87, 0.1),
    0 5px 14px rgba(24, 40, 64, 0.18);
  color: #4e5969;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translate(50%, -50%);
  &.pet-character-drag-mirrored {
    right: auto;
    left: 0;
    transform: translate(-50%, -50%);
  }
  .pet-character-drag-icon {
    pointer-events: none;
    font-size: 20px;
  }
}
</style>
