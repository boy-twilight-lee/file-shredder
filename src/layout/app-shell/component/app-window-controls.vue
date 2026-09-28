<template>
  <div class="app-window-controls">
    <a-button
      class="app-window-controls-button"
      type="text"
      aria-label="最小化"
      @click="handleMinimize"
    >
      <svg-icon
        name="icon-window-minimize"
        :size="16"
      />
    </a-button>
    <a-button
      class="app-window-controls-button"
      type="text"
      :aria-label="maximized ? '还原' : '最大化'"
      @click="handleToggleMaximize"
    >
      <svg-icon
        :name="maximized ? 'icon-window-restore' : 'icon-window-maximize'"
        :size="16"
      />
    </a-button>
    <a-button
      class="app-window-controls-button app-window-controls-button-close"
      type="text"
      aria-label="关闭"
      @click="handleClose"
    >
      <svg-icon
        name="icon-window-close"
        :size="16"
      />
    </a-button>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue';
defineOptions({
  name: 'AppWindowControls',
});
// 保存主窗口当前是否处于最大化状态，用于切换按钮图标。
const maximized = ref(false);
// 读取主窗口初始最大化状态并订阅后续变化。
const disposeMaximized = window.shredderApi.onWindowMaximized((value) => {
  maximized.value = value;
});
// 首次挂载时同步一次窗口最大化状态，覆盖订阅前的状态变化。
async function syncMaximizedOnce(): Promise<void> {
  try {
    maximized.value = await window.shredderApi.isWindowMaximized();
  } catch {
    // 查询失败时保持当前状态，不影响窗口控制按钮的基础可用性。
  }
}
onMounted(() => {
  syncMaximizedOnce();
});
onScopeDispose(() => disposeMaximized());
// 最小化主窗口。
function handleMinimize(): void {
  window.shredderApi.minimizeWindow().catch(() => undefined);
}
// 切换主窗口最大化与还原状态。
function handleToggleMaximize(): void {
  window.shredderApi.toggleMaximizeWindow().catch(() => undefined);
}
// 关闭主窗口。
function handleClose(): void {
  window.shredderApi.closeWindow().catch(() => undefined);
}
</script>
<style lang="less" scoped>
@import './app-window-controls.less';
</style>
