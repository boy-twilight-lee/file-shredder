<template>
  <div class="app-shell">
    <app-sidebar />
    <div class="app-shell-main">
      <app-titlebar />
      <div class="app-shell-content">
        <shred-page v-show="activePage === 'shred'" />
        <records-page v-show="activePage === 'records'" />
        <settings-page v-show="activePage === 'settings'" />
        <about-page v-show="activePage === 'about'" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onScopeDispose } from 'vue';
import AboutPage from '@/pages/about/index.vue';
import RecordsPage from '@/pages/records/index.vue';
import SettingsPage from '@/pages/settings/index.vue';
import ShredPage from '@/pages/shred/index.vue';
import AppSidebar from './component/app-sidebar.vue';
import AppTitlebar from './component/app-titlebar.vue';
import { useAppShellContext } from './hooks/useAppShellContext';
defineOptions({
  name: 'AppShell',
});
// 在外壳中创建上下文并向全部页面提供。
const { activePage, appSettings } = useAppShellContext().provide();
// 解除设置变更订阅。
const disposeSettingsChanged = window.shredderApi.onSettingsChanged(() => {
  appSettings.reload();
});
onMounted(() => {
  appSettings.reload();
});
onScopeDispose(() => disposeSettingsChanged());
</script>
<style lang="less" scoped>
@import './index.less';
</style>
