<template>
  <div class="cx-page-header">
    <a-link
      class="cx-page-header-back"
      title="返回"
      aria-label="返回"
      @click="handleBack"
    >
      <svg-icon
        name="icon-back"
        size="16"
      />
    </a-link>
    <span class="cx-page-header-title">{{ title }}</span>
  </div>
</template>
<script setup lang="ts">
import { CxPageHeaderEmits, CxPageHeaderProps } from './type';
// 定义通用页头展示的页面标题。
defineProps<CxPageHeaderProps>();
// 向所属页面发送返回操作。
const emit = defineEmits<CxPageHeaderEmits>();
// 响应返回按钮点击并通知所属页面。
function handleBack(): void {
  emit('back');
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
