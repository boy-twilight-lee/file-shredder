<template>
  <cx-card
    class="shred-level-setting"
    title="清理设置"
    description="设置文件清理强度与清理行为"
  >
    <div class="shred-level-setting-list">
      <cx-layout title="清理强度">
        <template #title-extra>
          <a-tooltip
            content-class="shred-level-setting-tooltip"
            position="top"
          >
            <span class="shred-level-setting-tip">
              <svg-icon name="icon-information" />
            </span>
            <template #content>
              <span
                v-for="line in SHRED_LEVEL_TIP_LINES"
                :key="line"
              >
                {{ line }}
              </span>
            </template>
          </a-tooltip>
        </template>
        <a-radio-group
          :model-value="settings.passes"
          :options="SHRED_LEVEL_OPTIONS"
          type="button"
          @change="handlePassesChange"
        >
          <template #label="{ data }">
            <span class="shred-level-setting-option">
              <svg-icon
                :name="data.icon"
                :size="16"
              />
              <span>
                {{ data.label }}
              </span>
            </span>
          </template>
        </a-radio-group>
      </cx-layout>
      <cx-layout title="清理行为">
        <a-radio-group
          :model-value="cleanupBehavior"
          :options="CLEANUP_BEHAVIOR_OPTIONS"
          type="button"
          @change="handleCleanupBehaviorChange"
        >
          <template #label="{ data }">
            <span class="shred-level-setting-option">
              <svg-icon
                :name="data.icon"
                :size="16"
              />
              <span>
                {{ data.label }}
              </span>
            </span>
          </template>
        </a-radio-group>
      </cx-layout>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { useShredSettingsContext } from '../../hooks';
import {
  CLEANUP_BEHAVIOR_OPTIONS,
  SHRED_LEVEL_OPTIONS,
  SHRED_LEVEL_TIP_LINES,
} from '../../constants';
import CxCard from '@/components/cx-card';
import CxLayout from '@/components/cx-layout';
// 读取设置页共享的清理设置状态与保存操作。
const { settings, updatePasses, updateBooleanSetting } =
  useShredSettingsContext().inject();
// 将布尔设置换算为清理行为按钮组使用的选项值。
const cleanupBehavior = computed(() =>
  settings.value.removeRootDirectory ? 'delete' : 'keep',
);
// 校验并上报按钮组返回的清理强度。
function handlePassesChange(value: string | number | boolean): void {
  if (value === 0 || value === 3 || value === 7 || value === 35)
    updatePasses(value);
}
// 校验并上报按钮组返回的清理行为，删除时连同根目录一起清理。
function handleCleanupBehaviorChange(value: string | number | boolean): void {
  if (value === 'delete' || value === 'keep')
    updateBooleanSetting('removeRootDirectory', value === 'delete');
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
