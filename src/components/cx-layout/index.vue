<template>
  <component
    :is="tag"
    :class="[
      'cx-layout',
      `cx-layout-${direction}`,
      {
        'cx-layout-emphasis': emphasis,
        'cx-layout-compact': size === 'compact',
      },
    ]"
  >
    <span class="cx-layout-heading">
      <span class="cx-layout-title">
        {{ title }}
        <a-tooltip
          v-if="isTooltipVisible"
          position="top"
        >
          <svg-icon
            class="cx-layout-tooltip"
            name="icon-information"
          />
          <template #content>
            <slot name="tooltip">{{ tooltipContent }}</slot>
          </template>
        </a-tooltip>
        <slot name="title-extra" />
      </span>
      <span
        v-if="description || $slots.description"
        class="cx-layout-desc"
      >
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
    <div class="cx-layout-content">
      <slot />
    </div>
  </component>
</template>
<script setup lang="ts">
import { CxLayoutProps } from './type';
// 定义通用布局行的标题、补充说明、标题说明浮层、标题强调、排版规格、排列方向与语义标签。
const props = withDefaults(defineProps<CxLayoutProps>(), {
  description: '',
  emphasis: false,
  size: 'default',
  direction: 'vertical',
  tag: 'div',
  tooltip: false,
});
// 读取组件插槽，用于判断标题说明是否由插槽提供内容。
const slots = useSlots();
// 汇总标题说明浮层的启用条件，直接文案与说明插槽都会在标题后展示说明图标。
const isTooltipVisible = computed(
  () => Boolean(props.tooltip) || Boolean(slots.tooltip),
);
// 读取属性直接传入的说明文案，说明插槽存在时由插槽内容优先展示。
const tooltipContent = computed(() =>
  typeof props.tooltip === 'string' ? props.tooltip : '',
);
</script>
<style lang="less" scoped>
@import './index.less';
</style>
