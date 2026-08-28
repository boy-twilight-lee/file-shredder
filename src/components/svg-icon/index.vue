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

<script lang="ts" setup>
import { valueToPx } from '@/utils';
import { isUndefined, isArray } from 'lodash-es';
defineOptions({
  name: 'PcSvgIcon',
});
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
const { size, color } = toRefs(props);
// symbolId
const symbolId = computed(() => `#${props.prefix}-${props.name}`);
// width
const width = computed(() => {
  return isUndefined(size.value)
    ? '1em'
    : valueToPx(isArray(size.value) ? size.value[0] : size.value);
});
// height
const height = computed(() => {
  return isUndefined(size.value)
    ? '1em'
    : valueToPx(isArray(size.value) ? size.value[1] : size.value);
});
</script>

<style lang="less" scoped>
.svg-icon {
  display: inline-block;
  overflow: hidden;
  width: v-bind(width);
  height: v-bind(height);
  color: v-bind(color);
}
</style>
