<template>
  <div class="shred-page-header">
    <a-link
      class="shred-page-header-back"
      title="返回"
      aria-label="返回操作菜单"
      @click="handleBack"
    >
      <svg-icon
        name="app-back"
        size="16"
      />
    </a-link>
    <span class="shred-page-header-title">{{ title }}</span>
  </div>
</template>
<script setup lang="ts">
// 定义气泡子页面展示的标题。
defineProps<{ title: string }>();
// 向所属页面发送返回操作。
const emit = defineEmits<{ back: [] }>();
// 响应返回按钮点击并通知所属页面。
function handleBack(): void {
  emit('back');
}
</script>
<style lang="less" scoped>
.shred-page-header {
  height: 40px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e7ebf0;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  .shred-page-header-back {
    cursor: pointer;
    padding: 0;
    font-size: 16px;
    line-height: 22px;
    color: #79828f;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    &:hover {
      color: #244fd6;
    }
  }
  .shred-page-header-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    flex: 1;
  }
}
</style>
