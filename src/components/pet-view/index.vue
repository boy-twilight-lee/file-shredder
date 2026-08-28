<template>
  <main
    class="pet-view"
    :style="petAppearanceStyle"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <pet-bubble :gap="8" />
    <pet-character />
  </main>
</template>

<script setup lang="ts">
import { providePetViewContext } from './hooks';
import { PetBubble, PetCharacter } from './component';
// 组件只消费 context，默认值、状态、派生数据和生命周期统一由 context 管理。
const { petAppearanceStyle, handleDrop, handleDragEnter, handleDragLeave } =
  providePetViewContext();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
