<template>
  <main class="pet-bubble-records">
    <header class="pet-bubble-records-header">
      <a-link
        class="pet-bubble-records-back"
        title="返回"
        aria-label="返回操作菜单"
        @click="showBubble('actions')"
      >
        <icon-left />
      </a-link>
      <h1 class="pet-bubble-records-title">粉碎记录</h1>
    </header>

    <a-spin
      :loading="isLoading"
      class="pet-bubble-records-content"
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
import '@arco-design/web-vue/es/message/style/css.js';
import type { ShredLog } from '@/type';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { ShredRecordPanel } from './component';

const logs = ref<ShredLog[]>([]);
const isLoading = ref(true);
const disposers: Array<() => void> = [];
const { showBubble } = usePetViewContext().inject();

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
