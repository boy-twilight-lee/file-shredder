<template>
  <span
    v-if="!record.success"
    class="record-result-cell"
    :title="resultMessage"
  >
    {{ resultMessage }}
  </span>
</template>
<script setup lang="ts">
import { ShredLog } from '@/type';
// 读取当前结果单元格对应的粉碎记录。
const props = defineProps<{ record: ShredLog }>();
// 根据目标类型与执行结果生成记录说明。
const resultMessage = computed(() => {
  if (props.record.targetType === 'directory')
    return `成功 ${props.record.succeededCount ?? 0} 个，失败 ${props.record.failedCount ?? 0} 个`;
  return props.record.message;
});
</script>
<style lang="less" scoped>
.record-result-cell {
  overflow: hidden;
  min-width: 0;
  font-size: 12px;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #f53f3f;
  display: block;
  flex: 1;
}
</style>
