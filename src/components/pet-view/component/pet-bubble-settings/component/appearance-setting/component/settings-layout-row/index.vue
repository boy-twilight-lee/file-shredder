<template>
  <component
    :is="tag"
    :class="['settings-layout-row', `settings-layout-row-${direction}`]"
  >
    <span class="settings-layout-row-title">{{ title }}</span>
    <div class="settings-layout-row-content">
      <slot />
    </div>
  </component>
</template>
<script setup lang="ts">
// 定义设置表单行的标题、排列方向与可选标签容器。
withDefaults(
  defineProps<{
    title: string;
    direction?: 'horizontal' | 'vertical';
    tag?: 'div' | 'label';
  }>(),
  {
    direction: 'vertical',
    tag: 'div',
  },
);
</script>
<style lang="less" scoped>
.settings-layout-row {
  display: flex;
  .settings-layout-row-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    color: #0d1014;
  }
  &.settings-layout-row-vertical {
    flex-direction: column;
    gap: 8px;
    .settings-layout-row-content {
      width: 100%;
    }
  }
  &.settings-layout-row-horizontal {
    align-items: center;
    gap: 16px;
    .settings-layout-row-title {
      flex-shrink: 0;
    }
    .settings-layout-row-content {
      display: flex;
      flex: 1;
      align-items: center;
    }
  }
}
</style>
