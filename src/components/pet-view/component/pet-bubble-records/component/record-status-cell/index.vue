<template>
  <a-tooltip
    :content="message"
    content-class="pet-bubble-records-result-tooltip"
  >
    <span
      class="record-status-cell"
      :class="statusClass"
    >
      {{ statusLabel }}
    </span>
  </a-tooltip>
</template>
<script setup lang="ts">
// 定义粉碎状态单元格需要展示的结果信息。
defineProps<{
  message: string;
  statusClass: string;
  statusLabel: string;
}>();
</script>
<style lang="less" scoped>
.record-status-cell {
  height: 20px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  &.record-status-cell-success {
    background: rgba(0, 168, 112, 0.1);
    color: #00a870;
  }
  &.record-status-cell-failure {
    background: rgba(245, 63, 63, 0.1);
    color: #f53f3f;
  }
}
</style>
