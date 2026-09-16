<template>
  <div class="cx-card">
    <div
      v-if="title || description || $slots.header"
      class="cx-card-header"
    >
      <slot name="header">
        <span
          v-if="title"
          class="cx-card-title"
        >
          {{ title }}
        </span>
      </slot>
    </div>
    <div class="cx-card-content">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
import { CxCardProps } from './type';
// 定义通用卡片可选的标题与辅助说明文案。
withDefaults(defineProps<CxCardProps>(), {
  title: '',
  description: '',
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
