<template>
  <svg
    aria-hidden="true"
    :class="['svg-icon', $attrs.class]"
  >
    <use
      :xlink:href="symbolId"
      fill="currentColor"
    />
  </svg>
</template>
<script setup lang="ts">
import { isUndefined, isArray } from 'lodash-es';
import { valueToPx } from '@/utils';
defineOptions({
  name: 'PcSvgIcon',
});
// 合并 SVG 图标属性与默认展示配置。
const props = withDefaults(
  defineProps<{
    prefix?: string;
    name: string;
    size?: number | string | Array<number | string>;
    color?: string;
  }>(),
  {
    prefix: 'icon',
    opacity: 1,
    color: 'inherit',
    size: undefined,
  },
);
// 提取图标尺寸与颜色属性供样式绑定使用。
const { size, color } = toRefs(props);
// 生成雪碧图中目标 symbol 的引用地址。
const symbolId = computed(() => `#${props.prefix}-${props.name}`);
// 将图标宽度转换为有效 CSS 尺寸。
const width = computed(() => {
  return isUndefined(size.value)
    ? '1em'
    : valueToPx(isArray(size.value) ? size.value[0] : size.value);
});
// 将图标高度转换为有效 CSS 尺寸。
const height = computed(() => {
  return isUndefined(size.value)
    ? '1em'
    : valueToPx(isArray(size.value) ? size.value[1] : size.value);
});
</script>
<style lang="less" scoped>
.svg-icon {
  overflow: hidden;
  height: v-bind(height);
  width: v-bind(width);
  color: v-bind(color);
  display: inline-block;
}
</style>
