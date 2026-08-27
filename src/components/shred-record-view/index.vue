<template>
  <main class="shred-record-view">
    <header class="shred-record-view-header">
      <a-link
        class="shred-record-view-back"
        title="返回"
        aria-label="返回操作菜单"
        @click="emit('close')"
      >
        <icon-left />
      </a-link>
      <h1 class="shred-record-view-title">粉碎记录</h1>
    </header>

    <a-spin
      :loading="isLoading"
      class="shred-record-view-content"
    >
      <shred-record-panel
        :logs="logs"
        @delete-logs="deleteLogs"
      />
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import type { ShredLog } from '@/type';
import { ShredRecordPanel } from './component';
import '@arco-design/web-vue/es/message/style/css.js';

const emit = defineEmits<{ close: [] }>();
const logs = ref<ShredLog[]>([]);
const isLoading = ref(true);
const disposers: Array<() => void> = [];

async function refreshLogs(): Promise<void> {
  logs.value = await window.shredderApi.getLogs();
  isLoading.value = false;
}

async function deleteLogs(ids: Array<string | number>): Promise<void> {
  try {
    logs.value = await window.shredderApi.deleteLogs(ids.map(String));
    Message.success(`已删除 ${ids.length} 条粉碎记录`);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '粉碎记录删除失败');
  }
}

onMounted(async () => {
  await refreshLogs();
  disposers.push(window.shredderApi.onLogsUpdated(refreshLogs));
});

onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
</script>

<style lang="less" scoped>
@import './index.less';
</style>
