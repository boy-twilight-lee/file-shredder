<template>
  <svg
    class="svg-icon"
    aria-hidden="true"
    focusable="false"
  >
    <use
      :href="symbolId"
      fill="currentColor"
    />
  </svg>
</template>

<script setup lang="ts">
import { toCssSize } from '@/utils';

defineOptions({
  name: 'SvgIcon',
});

const props = withDefaults(
  defineProps<{
    prefix?: string;
    name: string;
    size?: number | string | [number | string, number | string];
    color?: string;
  }>(),
  {
    prefix: 'icon',
    size: undefined,
    color: 'inherit',
  },
);

const symbolId = computed(() => `#${props.prefix}-${props.name}`);

const width = computed(() =>
  toCssSize(Array.isArray(props.size) ? props.size[0] : props.size, '1em'),
);
const height = computed(() =>
  toCssSize(Array.isArray(props.size) ? props.size[1] : props.size, '1em'),
);
</script>

<style lang="less" scoped>
.svg-icon {
  overflow: hidden;
  height: v-bind(height);
  width: v-bind(width);
  color: v-bind('props.color');
  vertical-align: -0.125em;
  display: inline-block;
  flex-shrink: 0;
}
</style>
