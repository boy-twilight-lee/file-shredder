<template>
  <section class="pet-bubble-actions">
    <header class="pet-bubble-actions-header">
      <img
        class="pet-bubble-actions-avatar"
        :src="appIconSource"
        alt="文件粉碎精灵"
      />
      <span class="pet-bubble-actions-heading">
        <strong>文件粉碎精灵</strong>
        <small>安全、彻底地清理文件</small>
      </span>
      <span class="pet-bubble-actions-header-tools">
        <a-tooltip
          v-for="item in PET_HEADER_ACTION_OPTIONS"
          :key="item.key"
          :content="item.title"
          position="top"
        >
          <button
            class="pet-bubble-actions-header-button"
            type="button"
            :title="item.title"
            :aria-label="item.title"
            @click="handleAction(item.key)"
          >
            <svg-icon
              class="pet-bubble-actions-header-icon"
              :name="item.icon"
            />
          </button>
        </a-tooltip>
      </span>
    </header>
    <div
      class="pet-bubble-actions-list"
      role="menu"
    >
      <button
        v-for="item in PET_ACTION_OPTIONS"
        :key="item.key"
        class="pet-bubble-actions-item"
        :class="`pet-bubble-actions-item-${item.tone}`"
        type="button"
        role="menuitem"
        @click="handleAction(item.key)"
      >
        <span class="pet-bubble-actions-icon-wrap">
          <svg-icon
            :name="item.icon"
            class="pet-bubble-actions-icon"
          />
        </span>
        <span class="pet-bubble-actions-content">
          <span class="pet-bubble-actions-item-heading">
            <strong>{{ item.title }}</strong>
            <small class="pet-bubble-actions-badge">{{ item.badge }}</small>
          </span>
          <small>{{ item.description }}</small>
        </span>
        <svg-icon
          class="pet-bubble-actions-chevron"
          name="app-arrow-right"
        />
      </button>
    </div>
    <footer class="pet-bubble-actions-tip">
      <span class="pet-bubble-actions-tip-icon">
        <svg-icon name="app-heart" />
      </span>
      <span>小贴士：文件或文件夹也可以直接拖到我身上。</span>
    </footer>
  </section>
</template>
<script setup lang="ts">
import Message from '@arco-design/web-vue/es/message';
import '@arco-design/web-vue/es/message/style/css.js';
import appIconSource from '@/assets/app-icon.png';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PET_ACTION_OPTIONS, PET_HEADER_ACTION_OPTIONS } from './constants';
// 读取目标选择与气泡导航能力。
const { chooseTargets, closeBubble, showBubble } = usePetViewContext().inject();
// 根据菜单项执行导航、系统操作或目标选择。
async function handleAction(
  key:
    | (typeof PET_ACTION_OPTIONS)[number]['key']
    | (typeof PET_HEADER_ACTION_OPTIONS)[number]['key'],
): Promise<void> {
  if (key === 'settings' || key === 'records') {
    showBubble(key);
    return;
  }
  if (key === 'lock') {
    try {
      // 标识当前系统锁屏请求是否成功执行。
      const isLocked = await window.shredderApi.lockScreen();
      if (!isLocked) {
        Message.error('当前系统不支持屏幕锁定');
        return;
      }
      closeBubble();
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '屏幕锁定失败');
    }
    return;
  }
  if (key === 'close') {
    await window.shredderApi.exitApp();
    return;
  }
  await chooseTargets(key);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
