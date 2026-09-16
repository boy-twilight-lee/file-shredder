<template>
  <div class="shred-actions">
    <pet-bubble-actions-header @select="handleAction" />
    <div
      class="shred-actions-list"
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
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PET_ACTION_OPTIONS } from './constants';
import {
  PetBubbleAction,
  PetBubbleActionsHeader,
  PetBubbleActionsTip,
} from './component';
// 读取目标选择与气泡导航能力。
const { chooseTargets, showBubble } = usePetViewContext().inject();
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
</script>
<style lang="less" scoped>
@import './index.less';
</style>
