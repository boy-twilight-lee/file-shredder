<template>
  <cx-card
    class="shred-level-setting"
    title="清理设置"
    description="设置文件清理强度与文件夹清理行为"
  >
    <div class="shred-level-setting-list">
      <cx-layout title="清理强度">
        <template #title-extra>
          <a-tooltip
            :content="SHRED_LEVEL_TIP"
            content-class="shred-level-setting-tooltip"
            position="top"
          >
            <span class="shred-level-setting-tip">
              <svg-icon name="icon-information" />
            </span>
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
      <div class="shred-level-setting-folder">
        <span class="shred-level-setting-folder-icon">
          <svg-icon name="icon-folder-open" />
        </span>
        <div class="shred-level-setting-folder-content">
          <span class="shred-level-setting-folder-label">文件夹清理行为</span>
          <span class="shred-level-setting-folder-desc">
            清理文件夹时是否删除根目录，关闭后仅清理文件夹内容
          </span>
        </div>
        <a-switch
          :model-value="settings.removeRootDirectory"
          :before-change="handleRemoveRootDirectoryChange"
        />
      </div>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { useShredSettingsContext } from '../../hooks';
import { SHRED_LEVEL_OPTIONS, SHRED_LEVEL_TIP } from '../../constants';
import CxCard from '@/components/cx-card';
import CxLayout from '@/components/cx-layout';
// 读取设置页共享的清理设置状态与保存操作。
const { settings, updatePasses, updateBooleanSetting } =
  useShredSettingsContext().inject();
// 校验并上报按钮组返回的清理强度。
function handlePassesChange(value: string | number | boolean): void {
  if (value === 0 || value === 3 || value === 7 || value === 35)
    updatePasses(value);
}
// 等待文件夹根目录清理行为保存完成后再切换开关。
function handleRemoveRootDirectoryChange(
  value: boolean | string | number,
): Promise<boolean> {
  return updateBooleanSetting('removeRootDirectory', value);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
