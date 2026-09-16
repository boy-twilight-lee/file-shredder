<template>
  <a-spin
    :loading="isLoading"
    class="shred-settings"
  >
    <cx-page-header
      title="常规设置"
      @back="showBubble('actions')"
    />
    <a-scrollbar>
      <div class="shred-settings-list">
        <appearance-setting />
        <shred-level-setting />
        <system-setting />
      </div>
    </a-scrollbar>
  </a-spin>
</template>
<script setup lang="ts">
import { useShredSettingsContext } from './hooks';
import { usePetViewContext } from '@/pages/pet-view/hooks';
import {
  AppearanceSetting,
  ShredLevelSetting,
  SystemSetting,
} from './component';
import CxPageHeader from '@/components/cx-page-header';
// 组件只消费 context，设置状态与保存操作统一由 context 管理。
const { isLoading } = useShredSettingsContext().provide();
// 读取气泡页面导航能力。
const { showBubble } = usePetViewContext().inject();
</script>
<style lang="less" scoped>
@import './index.less';
</style>
