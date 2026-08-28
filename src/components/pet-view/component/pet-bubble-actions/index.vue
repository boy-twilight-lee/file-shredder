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
          <component
            :is="actionIcons[item.key]"
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
        <icon-right class="pet-bubble-actions-chevron" />
      </button>
    </div>
    <footer class="pet-bubble-actions-tip">
      <span class="pet-bubble-actions-tip-icon"><icon-heart-fill /></span>
      <span>小贴士：文件或文件夹也可以直接拖到我身上。</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import {
  IconFile,
  IconFolder,
  IconHeartFill,
  IconHistory,
  IconPoweroff,
  IconRight,
  IconSettings,
} from '@arco-design/web-vue/es/icon';
import appIconSource from '@/assets/app-icon.png';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/constants';
import { usePetViewContext } from '@/components/pet-view/hooks';

const actionIcons = {
  file: IconFile,
  directory: IconFolder,
  settings: IconSettings,
  records: IconHistory,
  close: IconPoweroff,
};
const { chooseTargets, showBubble } = usePetViewContext();

async function handleAction(
  key: (typeof PET_ACTION_OPTIONS)[number]['key'],
): Promise<void> {
  if (key === 'settings' || key === 'records') {
    showBubble(key);
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
