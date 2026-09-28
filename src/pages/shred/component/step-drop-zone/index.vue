<template>
  <div
    :class="['shred-drop-zone', { 'shred-drop-zone-active': isDragging }]"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="shred-drop-zone-frame">
      <i class="shred-drop-zone-glow shred-drop-zone-glow-start" />
      <i class="shred-drop-zone-glow shred-drop-zone-glow-end" />
      <div class="shred-drop-zone-body">
        <span class="shred-drop-zone-title">把文件或文件夹拖到这里</span>
        <span class="shred-drop-zone-subtitle">
          支持一次拖入多个目标，加入后仍可逐项核对与移除
        </span>
        <span class="shred-drop-zone-tip">
          清理后数据无法恢复，请确认目标无误后再执行
        </span>
        <svg-icon
          class="shred-drop-zone-illustration"
          name="illustration-drop"
          :size="[340, 240]"
        />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useAppShellContext } from '@/layout';
defineOptions({
  name: 'ShredDropZone',
});
// 读取外壳上下文中的目标添加动作。
const { task } = useAppShellContext().inject();
// 标识当前是否有文件正被拖拽到拖拽区上方。
const isDragging = ref(false);
// 统计进入拖拽区的嵌套层数，避免掠过子元素时反复切换高亮。
const dragDepth = ref(0);
// 首次进入拖拽区时开启高亮。
function handleDragEnter(): void {
  dragDepth.value += 1;
  isDragging.value = true;
}
// 持续阻止浏览器默认打开文件的行为。
function handleDragOver(): void {
  isDragging.value = true;
}
// 离开拖拽区时按嵌套层数关闭高亮。
function handleDragLeave(): void {
  dragDepth.value = Math.max(dragDepth.value - 1, 0);
  if (dragDepth.value === 0) isDragging.value = false;
}
// 读取拖入文件的本地路径并加入待清除目标。
async function handleDrop(event: DragEvent): Promise<void> {
  dragDepth.value = 0;
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  // 借助主进程解析被拖入文件的真实本地路径。
  const paths = files
    .map((file) => window.shredderApi.getPathForFile(file))
    .filter((path) => path.length > 0);
  await task.addTargets(paths);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
