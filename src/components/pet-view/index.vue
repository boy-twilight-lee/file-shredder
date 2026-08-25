<template>
  <main
    class="pet-view"
    :style="petAppearanceStyle"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <pet-bubble />

    <div
      class="pet-view-character"
      :class="{ 'pet-view-character-working': petState === 'working' }"
      @mousedown.left="handleCharacterMouseDown"
      @mousedown.right.stop
      @mouseup.left="handleCharacterMouseUp"
      @contextmenu.prevent
    >
      <img
        class="pet-view-image"
        :class="`pet-view-image-${petState}`"
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

// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const {
  petState,
  petAppearanceStyle,
  petImageSource,
  handleCharacterMouseDown,
  handleCharacterMouseUp,
  handleDrop,
  handleDragEnter,
  handleDragLeave,
  handlePetImageLoad,
} = providePetViewContext();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
