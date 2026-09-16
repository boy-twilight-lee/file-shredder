<template>
  <component
    :is="tag"
    :class="[
      'cx-layout',
      `cx-layout-${direction}`,
      { 'cx-layout-emphasis': emphasis },
    ]"
  >
    <span class="cx-layout-heading">
      <span class="cx-layout-title">{{ title }}</span>
      <span
        v-if="description"
        class="cx-layout-desc"
      >
        {{ description }}
      </span>
    </span>
    <div class="cx-layout-content">
      <slot />
    </div>
  </component>
</template>
<script setup lang="ts">
import { CxLayoutProps } from './type';
// 定义通用布局行的标题、补充说明、标题强调、排列方向与语义标签。
withDefaults(defineProps<CxLayoutProps>(), {
  description: '',
  emphasis: false,
  direction: 'vertical',
  tag: 'div',
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
