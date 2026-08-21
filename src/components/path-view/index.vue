<script setup lang="ts">
import { ref } from 'vue';
import { Message } from '@arco-design/web-vue';
import appIcon from '@/assets/app-icon.png';

const pathInput = ref('');
const isSubmitting = ref(false);

async function submitPath(): Promise<void> {
  const path = pathInput.value.trim();
  if (!path || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const settings = await window.shredderApi.getSettings();
    await window.shredderApi.shred([path], settings.passes);
    pathInput.value = '';
    window.shredderApi.hideCurrentWindow();
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '无法处理该路径');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="path-view">
    <header class="path-view-header">
      <img :src="appIcon" alt="" />
      <div><h1>输入指定路径</h1><p>支持文件或文件夹的完整 Windows 路径</p></div>
    </header>
    <a-input-search v-model="pathInput" size="large" placeholder="例如 D:\Work\secret.zip" search-button :loading="isSubmitting" @search="submitPath">
      <template #button-icon>继续</template>
    </a-input-search>
    <p class="path-view-tip">提交后仍会遵循设置中的粉碎确认开关与覆写等级。</p>
  </main>
</template>

<style lang="less" scoped>
:global(*) { box-sizing: border-box; }
:global(html), :global(body), :global(#app) { width: 100%; min-height: 100%; margin: 0; background: #f5f7fa; }

.path-view {
  min-height: 100vh;
  padding: 28px 32px;
  color: #0d1014;

  .path-view-header {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 24px;
    img { width: 48px; height: 48px; border-radius: 13px; }
    h1 { margin: 0; font-size: 20px; font-weight: 600; }
    p { margin: 4px 0 0; color: #79828f; font-size: 12px; }
  }

  .path-view-tip { margin: 12px 0 0; color: #99a1ad; font-size: 12px; }
}
</style>
