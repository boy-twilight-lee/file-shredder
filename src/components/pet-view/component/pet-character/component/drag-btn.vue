<template>
  <button
    class="drag-btn"
    type="button"
    title="拖动桌宠"
    aria-label="拖动桌宠"
    @click.stop
  >
    <icon-drag-arrow
      class="drag-btn-icon"
      :stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </button>
</template>
<script setup lang="ts">
import { IconDragArrow } from '@arco-design/web-vue/es/icon';
</script>
<style lang="less" scoped>
.drag-btn {
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
  .drag-btn-icon {
    pointer-events: none;
    height: 18px;
    width: 18px;
  }
}
</style>
