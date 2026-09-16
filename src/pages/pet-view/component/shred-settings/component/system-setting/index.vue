<template>
  <cx-card
    title="系统设置"
    class="system-setting"
  >
    <div class="system-setting-list">
      <cx-layout
        v-for="item in SYSTEM_SETTING_OPTIONS"
        :key="item.key"
        class="system-setting-item"
        direction="horizontal"
        :title="item.label"
        :description="item.description"
        size="compact"
      >
        <a-switch
          :model-value="settings[item.key]"
          :before-change="(value) => updateBooleanSetting(item.key, value)"
          size="small"
        />
      </cx-layout>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { useShredSettingsContext } from '../../hooks';
import { SYSTEM_SETTING_OPTIONS } from '../../constants';
import CxCard from '@/components/cx-card';
import CxLayout from '@/components/cx-layout';
// 读取设置页共享的系统设置状态与保存操作。
const { settings, updateBooleanSetting } = useShredSettingsContext().inject();
</script>
<style lang="less" scoped>
@import './index.less';
</style>
