<template>
  <cx-card
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
          <span class="system-setting-label">{{ item.label }}</span>
          <span class="system-setting-desc">{{ item.description }}</span>
        </div>
        <a-switch
          :model-value="settings[item.key]"
          :before-change="(value) => updateBooleanSetting(item.key, value)"
        />
      </div>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { useShredSettingsContext } from '../../hooks';
import { SYSTEM_SETTING_OPTIONS } from '../../constants';
import CxCard from '@/components/cx-card';
// 读取设置页共享的系统设置状态与保存操作。
const { settings, updateBooleanSetting } = useShredSettingsContext().inject();
</script>
<style lang="less" scoped>
@import './index.less';
</style>
