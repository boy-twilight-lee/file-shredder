<template>
  <div class="pet-bubble-actions">
    <pet-bubble-actions-header
      :title="bubbleAppTitle"
      :icon-source="bubbleAppIconSource"
      @select="handleAction"
    />
    <div
      class="pet-bubble-actions-list"
      role="menu"
    >
      <pet-bubble-action
        v-for="item in PET_ACTION_OPTIONS"
        :key="item.key"
        :item="item"
        @select="handleAction"
      />
    </div>
    <pet-bubble-actions-tip />
  </div>
</template>
<script setup lang="ts">
import { PetActionKey, PetHeaderActionKey } from './type';
import appIconSource from '@/assets/app-icon.png';
import { DEFAULT_BUBBLE_APP_TITLE } from '@/constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PET_ACTION_OPTIONS } from './constants';
import {
  PetBubbleAction,
  PetBubbleActionsHeader,
  PetBubbleActionsTip,
} from './component';
// 读取目标选择与气泡导航能力。
const { chooseTargets, showBubble } = usePetViewContext().inject();
// 保存操作气泡当前展示的应用标题。
const bubbleAppTitle = ref(DEFAULT_BUBBLE_APP_TITLE);
// 保存操作气泡当前展示的内置或自定义应用图标。
const bubbleAppIconSource = ref(appIconSource);
// 收集组件销毁时需要执行的事件清理器。
const disposers: Array<() => void> = [];
// 从持久化设置刷新操作气泡头部品牌信息。
async function refreshBubbleBranding(): Promise<void> {
  // 并行读取标题设置与自定义图标数据。
  const [settings, customIconSource] = await Promise.all([
    window.shredderApi.getSettings(),
    window.shredderApi.getBubbleAppIcon(),
  ]);
  bubbleAppTitle.value = settings.bubbleAppTitle || DEFAULT_BUBBLE_APP_TITLE;
  bubbleAppIconSource.value = customIconSource || appIconSource;
}
// 根据菜单项执行导航、系统操作或目标选择。
async function handleAction(
  key: PetActionKey | PetHeaderActionKey,
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
// 组件挂载后加载品牌设置并订阅后续变更。
onMounted(async () => {
  disposers.push(window.shredderApi.onSettingsChanged(refreshBubbleBranding));
  await refreshBubbleBranding();
});
// 组件销毁前解除设置变化监听。
onBeforeUnmount(() => {
  // 依次执行已注册的设置更新清理器。
  disposers.forEach((dispose) => dispose());
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
