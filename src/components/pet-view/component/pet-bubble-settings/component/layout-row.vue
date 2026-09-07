<template>
  <component
    :is="tag"
    :class="['layout-row', `layout-row-${direction}`]"
  >
    <span class="layout-row-title">{{ title }}</span>
    <div class="layout-row-content">
      <slot />
    </div>
  </component>
</template>
<script setup lang="ts">
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
.layout-row {
  min-width: 0;
  display: flex;

  .layout-row-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    color: #0D1014;
  }

  .layout-row-content {
    min-width: 0;
  }

  &.layout-row-vertical {
    flex-direction: column;
    gap: 8px;

    .layout-row-content {
      width: 100%;
    }
  }

  &.layout-row-horizontal {
    align-items: center;
    gap: 16px;

    .layout-row-title {
      flex-shrink: 0;
    }

    .layout-row-content {
      display: flex;
      flex: 1;
      align-items: center;
    }
  }
}
</style>
