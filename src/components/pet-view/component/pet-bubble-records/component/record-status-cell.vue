<template>
  <span
    class="record-status-cell"
    :class="statusClass"
  >
    <svg-icon
      class="record-status-cell-icon"
      :name="statusIconName"
    />
    {{ statusLabel }}
  </span>
</template>
<script setup lang="ts">
import { ShredLog } from '@/type';
// 读取当前状态单元格对应的粉碎记录。
const props = defineProps<{ record: ShredLog }>();
// 根据粉碎结果生成状态样式。
const statusClass = computed(() =>
  props.record.success
    ? 'record-status-cell-success'
    : 'record-status-cell-failure',
);
// 根据粉碎结果选择状态图标。
const statusIconName = computed(() =>
  props.record.success ? 'app-check-circle' : 'app-close-circle',
);
// 根据粉碎结果生成状态文案。
const statusLabel = computed(() => (props.record.success ? '成功' : '失败'));
</script>
<style lang="less" scoped>
.record-status-cell {
  height: 18px;
  padding: 0 6px;
  background: rgba(0, 168, 112, 0.09);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3px;
  .record-status-cell-icon {
    height: 10px;
    width: 10px;
    flex-shrink: 0;
  }
  &.record-status-cell-success {
    color: #00a870;
  }
  &.record-status-cell-failure {
    background: rgba(245, 63, 63, 0.09);
    color: #f53f3f;
  }
}
</style>
