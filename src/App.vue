<script setup lang="ts">
import { PetView, SettingsView } from './components';

const view = new URLSearchParams(window.location.search).get('view') ?? 'pet';
// 两个 Electron 窗口共用渲染入口，通过根属性隔离透明桌宠与不透明设置页的全局样式。
document.documentElement.dataset.appView = view;
</script>

<template>
  <pet-view v-if="view === 'pet'" />
  <settings-view v-else />
</template>
