<template>
  <div class="app-sidebar">
    <div class="app-sidebar-content">
      <div class="app-sidebar-brand">
        <img
          class="app-sidebar-logo"
          :src="appIcon"
          alt="文件粉碎精灵"
        />
      </div>
      <div class="app-sidebar-nav">
        <a-tooltip
          v-for="item in navigations"
          :key="item.key"
          :content="item.label"
          position="right"
          :mouse-enter-delay="300"
        >
          <button
            type="button"
            :class="[
              'app-sidebar-nav-item',
              { 'app-sidebar-nav-item-active': item.key === activePage },
            ]"
            :aria-label="item.label"
            :aria-current="item.key === activePage ? 'page' : undefined"
            @mouseenter="handleNavEnter(item.key)"
            @mouseleave="handleNavLeave()"
            @click="setActivePage(item.key)"
          >
            <nav-icon
              :name="item.icon"
              :size="20"
              :animated="isNavAnimated(item.key)"
            />
            <i
              v-if="item.key === 'shred' && running"
              class="app-sidebar-nav-badge"
            />
          </button>
        </a-tooltip>
      </div>
    </div>
    <div class="app-sidebar-divider" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import appIcon from '@/assets/app-icon.png';
import { NAVIGATION_ITEMS } from '@/constants';
import type { PageKey } from '@/type';
import { useAppShellContext } from '../hooks/useAppShellContext';
defineOptions({
  name: 'AppSidebar',
});
// 侧边导航展示的全部页面项。
const navigations = NAVIGATION_ITEMS;
// 读取外壳上下文中的当前页面与任务运行状态。
const { activePage, setActivePage, task } = useAppShellContext().inject();
// 当前是否存在正在执行的清理任务。
const running = task.running;
// 鼠标当前悬停的导航项，用于触发图标动效。
const hoveredKey = ref<PageKey | null>(null);
// 鼠标移入导航项时记录悬停目标。
function handleNavEnter(key: PageKey): void {
  hoveredKey.value = key;
}
// 鼠标移出导航项时清除悬停目标。
function handleNavLeave(): void {
  hoveredKey.value = null;
}
// 当前页面与鼠标悬停的导航项都需要播放图标动效。
function isNavAnimated(key: PageKey): boolean {
  return key === activePage.value || key === hoveredKey.value;
}
</script>
<style lang="less" scoped>
@import './app-sidebar.less';
</style>
