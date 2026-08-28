<template>
  <section class="pet-bubble-error">
    <strong class="pet-bubble-error-title">暂时无法处理</strong>
    <p class="pet-bubble-error-description">{{ errorMessage }}</p>
    <a-button
      type="primary"
      size="small"
      long
      @click="showBubble('actions')"
    >
      重新选择
    </a-button>
  </section>
</template>

<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';

const { errorMessage, showBubble } = usePetViewContext();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
