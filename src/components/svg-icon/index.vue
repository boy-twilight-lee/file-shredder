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

function resolveSize(value: number | string | undefined): string {
  // 数值尺寸统一转换为像素，字符串尺寸保留 em、rem、百分比等自定义单位。
  if (value === undefined) return '1em';
  return typeof value === 'number' ? `${value}px` : value;
}

const width = computed(() =>
  resolveSize(Array.isArray(props.size) ? props.size[0] : props.size),
);
const height = computed(() =>
  resolveSize(Array.isArray(props.size) ? props.size[1] : props.size),
);
</script>

<style lang="less" scoped>
.svg-icon {
  display: inline-block;
  flex: 0 0 auto;
  width: v-bind(width);
  height: v-bind(height);
  overflow: hidden;
  color: v-bind('props.color');
  vertical-align: -0.125em;
}
</style>
