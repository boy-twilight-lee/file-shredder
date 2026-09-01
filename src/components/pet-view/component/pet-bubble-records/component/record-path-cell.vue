<template>
  <span
    class="record-path-cell"
    :title="record.path"
  >
    <span class="record-path-cell-icon-box">
      <svg-icon
        :name="targetIconName"
        class="record-path-cell-icon"
        :aria-label="targetTypeLabel"
      />
    </span>
    <span class="record-path-cell-content">
      <strong class="record-path-cell-name">{{ pathName }}</strong>
      <span class="record-path-cell-meta">
        <slot name="meta" />
      </span>
    </span>
  </span>
</template>
<script setup lang="ts">
import { ShredLog } from '@/type';
import { getPathName } from '@/utils';
// 读取当前路径单元格对应的粉碎记录。
const props = defineProps<{ record: ShredLog }>();
// 提取粉碎目标路径的末级文件或文件夹名称。
const pathName = computed(() => getPathName(props.record.path));
// 根据粉碎目标类型选择路径图标。
const targetIconName = computed(() =>
  props.record.targetType === 'directory' ? 'app-folder' : 'app-file',
);
// 根据粉碎目标类型生成无障碍名称。
const targetTypeLabel = computed(() =>
  props.record.targetType === 'directory' ? '文件夹' : '文件',
);
</script>
<style lang="less" scoped>
.record-path-cell {
  overflow: hidden;
  min-width: 0;
  color: #1d2129;
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 10px;
  .record-path-cell-icon-box {
    height: 44px;
    width: 44px;
    background: #f1f5ff;
    border: 1px solid #e3eaff;
    border-radius: 8px;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    .record-path-cell-icon {
      height: 21px;
      width: 21px;
      color: #165dff;
    }
  }
  .record-path-cell-content {
    overflow: hidden;
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    .record-path-cell-name {
      overflow: hidden;
      min-width: 0;
      font-size: 13px;
      font-weight: 500;
      line-height: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }
    .record-path-cell-meta {
      overflow: hidden;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }
}
</style>
