<template>
  <settings-card
    class="system-setting"
    title="系统设置"
    description="管理置顶、开机启动和右键菜单。"
  >
    <div class="system-setting-list">
      <div
        v-for="item in SYSTEM_SETTING_OPTIONS"
        :key="item.key"
        class="system-setting-row"
      >
        <span class="system-setting-icon">
          <svg-icon :name="item.icon" />
        </span>
        <div class="system-setting-content">
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
        </div>
        <a-switch
          :model-value="settings[item.key]"
          :before-change="(value) => onBeforeChange(item.key, value)"
        />
      </div>
    </div>
  </settings-card>
</template>

<script setup lang="ts">
import type { SystemSettingProps } from './type';
import { SYSTEM_SETTING_OPTIONS } from './constants';
import { SettingsCard } from '../settings-card';

defineProps<SystemSettingProps>();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
