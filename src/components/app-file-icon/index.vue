<template>
  <svg-icon
    :name="iconName"
    :size="size"
  />
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { resolveFileKind } from '@/utils';
defineOptions({
  name: 'AppFileIcon',
});
// 描述文件类型图标所需的路径、目标类型与渲染尺寸。
const props = withDefaults(
  defineProps<{
    path: string;
    targetType?: 'file' | 'directory';
    size?: number | string;
  }>(),
  {
    targetType: 'file',
    size: 20,
  },
);
// 按目标路径推导文件类型图标名称。
const iconName = computed(
  () => `file-${resolveFileKind(props.path, props.targetType)}`,
);
</script>
