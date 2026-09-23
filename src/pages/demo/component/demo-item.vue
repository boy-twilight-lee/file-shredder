<template>
  <div :class="['demo-item', { 'demo-item-top': align === 'top' }]">
    <span class="demo-item-label">{{ label }}</span>
    <div class="demo-item-content">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: 'DemoItem',
});
// 描述示例卡片内单行变体的标签与对齐方式。
withDefaults(
  defineProps<{
    label: string;
    align?: 'center' | 'top';
  }>(),
  {
    align: 'center',
  },
);
</script>
<style lang="less" scoped>
.demo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  & + & {
    margin-top: 12px;
  }
  .demo-item-label {
    flex-shrink: 0;
    width: 108px;
    color: #79828f;
    font-size: 12px;
    line-height: 20px;
    text-align: right;
  }
  .demo-item-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  &.demo-item-top {
    align-items: flex-start;
    .demo-item-label {
      padding-top: 7px;
    }
  }
}
</style>
