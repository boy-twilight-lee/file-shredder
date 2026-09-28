<template>
  <div class="app-titlebar">
    <div class="app-titlebar-content">
      <div class="app-titlebar-heading">
        <span class="app-titlebar-title">{{ current.label }}</span>
        <i class="app-titlebar-heading-divider" />
        <span class="app-titlebar-description">{{ current.description }}</span>
      </div>
      <app-window-controls />
    </div>
    <div class="app-titlebar-divider" />
  </div>
</template>
<script setup lang="ts">
import { NAVIGATION_ITEMS } from '@/constants';
import AppWindowControls from './app-window-controls.vue';
import { useAppShellContext } from '../hooks/useAppShellContext';
defineOptions({
  name: 'AppTitlebar',
});
// 读取外壳上下文中的当前页面。
const { activePage } = useAppShellContext().inject();
// 当前页面的导航元数据，缺失时回退到首项避免渲染异常。
const current = computed(
  () =>
    NAVIGATION_ITEMS.find((item) => item.key === activePage.value) ??
    NAVIGATION_ITEMS[0],
);
</script>
<style lang="less" scoped>
@import './app-titlebar.less';
</style>
