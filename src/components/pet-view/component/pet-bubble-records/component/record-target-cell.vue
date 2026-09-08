<template>
  <span
    class="record-target-cell"
    :title="path"
  >
    <svg-icon
      class="record-target-cell-icon"
      :name="iconName"
    />
    <span class="record-target-cell-name">
      {{ name }}
    </span>
  </span>
</template>
<script setup lang="ts">
// 定义粉碎目标单元格需要展示的路径和名称信息。
defineProps<{ path: string; iconName: string; name: string }>();
</script>
<style lang="less" scoped>
.record-target-cell {
  overflow: hidden;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  .record-target-cell-icon {
    height: 15px;
    width: 15px;
    color: #165dff;
    flex-shrink: 0;
  }
  .record-target-cell-name {
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
