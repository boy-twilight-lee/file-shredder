<template>
  <settings-card
    class="bubble-header-setting"
    title="气泡头部"
  >
    <div class="bubble-header-setting-preview-card">
      <div class="bubble-header-setting-preview">
        <img
          class="bubble-header-setting-preview-icon"
          :src="appIconSource"
          :alt="appTitle"
        />
        <span class="bubble-header-setting-preview-heading">
          <strong>{{ appTitle || DEFAULT_BUBBLE_APP_TITLE }}</strong>
          <small>安全、彻底地清理文件</small>
        </span>
        <span class="bubble-header-setting-preview-tools">
          <span
            v-for="icon in PREVIEW_HEADER_ICONS"
            :key="icon"
            class="bubble-header-setting-preview-button"
          >
            <svg-icon :name="icon" />
          </span>
        </span>
      </div>
    </div>
    <label class="bubble-header-setting-row">
      <span class="bubble-header-setting-row-label">应用名称</span>
      <span class="bubble-header-setting-title-input">
        <a-input
          :model-value="appTitle"
          :max-length="BUBBLE_APP_TITLE_MAX_LENGTH"
          show-word-limit
          @update:model-value="emit('update-app-title', $event)"
          @blur="emit('save-app-title')"
          @press-enter="blurTitleInput"
        />
      </span>
    </label>
    <div class="bubble-header-setting-row">
      <span class="bubble-header-setting-row-label">应用图标</span>
      <div class="bubble-header-setting-icon-actions">
        <button
          class="bubble-header-setting-icon-upload"
          type="button"
          title="更换应用图标"
          aria-label="更换应用图标"
          :disabled="isChoosingAppIcon"
          @click="emit('choose-app-icon')"
        >
          <img
            :src="appIconSource"
            :alt="appTitle"
          />
        </button>
        <a-button
          v-if="hasCustomAppIcon"
          @click="emit('reset-app-icon')"
        >
          恢复默认
        </a-button>
      </div>
    </div>
  </settings-card>
</template>
<script setup lang="ts">
import {
  BUBBLE_APP_TITLE_MAX_LENGTH,
  DEFAULT_BUBBLE_APP_TITLE,
} from '@/constants';
import { BubbleHeaderSettingEmits, BubbleHeaderSettingProps } from './type';
import SettingsCard from '../settings-card.vue';
defineProps<BubbleHeaderSettingProps>();
// 向设置页上报标题编辑与图标管理操作。
const emit = defineEmits<BubbleHeaderSettingEmits>();
// 模拟操作气泡头部右侧工具按钮的真实占位。
const PREVIEW_HEADER_ICONS = ['app-history', 'app-settings'] as const;
// 按下回车时结束编辑，并复用失焦保存逻辑。
function blurTitleInput(event: KeyboardEvent): void {
  (event.currentTarget as HTMLInputElement | null)?.blur();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
