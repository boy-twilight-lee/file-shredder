<template>
  <settings-card
    class="appearance-setting"
    title="外观设置"
  >
    <div class="appearance-setting-content">
      <label class="appearance-setting-row">
        <span class="appearance-setting-row-label">应用名称</span>
        <span class="appearance-setting-title-input">
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
      <div class="appearance-setting-icon-section">
        <span class="appearance-setting-section-label">应用图标</span>
        <div class="appearance-setting-image-list">
          <div
            class="appearance-setting-image-item appearance-setting-icon-item"
          >
            <span class="appearance-setting-image-preview">
              <img
                :src="appIconSource"
                :alt="appTitle"
              />
            </span>
            <div class="appearance-setting-image-actions">
              <button
                class="appearance-setting-image-action"
                type="button"
                title="更换应用图标"
                aria-label="更换应用图标"
                :disabled="isChoosingAppIcon"
                @click.stop="emit('choose-app-icon')"
              >
                <svg-icon name="app-edit" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="appearance-setting-pet">
        <div class="appearance-setting-pet-heading">
          <span class="appearance-setting-section-label">桌宠形象</span>
        </div>
        <div class="appearance-setting-image-list">
          <article class="appearance-setting-image-item">
            <span class="appearance-setting-image-preview">
              <img
                :src="petImageSource"
                alt="桌宠形象"
              />
            </span>
            <div class="appearance-setting-image-actions">
              <button
                class="appearance-setting-image-action"
                type="button"
                title="更换桌宠形象"
                aria-label="更换桌宠形象"
                :disabled="isChoosingPetImage"
                @click.stop="emit('choose-pet-image')"
              >
                <svg-icon name="app-edit" />
              </button>
            </div>
          </article>
        </div>
      </div>
      <div class="appearance-setting-size-row">
        <span class="appearance-setting-size-label">桌宠大小</span>
        <div class="appearance-setting-size-controls">
          <div class="appearance-setting-size-input">
            <a-input-number
              :model-value="petSize"
              :min="PET_SIZE_MIN"
              :max="PET_SIZE_MAX"
              :step="PET_SIZE_STEP"
              hide-button
              @change="updatePetSize"
            />
            <span>px</span>
          </div>
        </div>
      </div>
    </div>
  </settings-card>
</template>
<script setup lang="ts">
import { BUBBLE_APP_TITLE_MAX_LENGTH } from '@/constants';
import { clamp } from '@/utils';
import { PET_SIZE_MAX, PET_SIZE_MIN, PET_SIZE_STEP } from './constants';
import { AppearanceSettingEmits, AppearanceSettingProps } from './type';
import SettingsCard from '../settings-card.vue';
defineProps<AppearanceSettingProps>();
// 向设置页上报外观编辑、形象替换与桌宠尺寸调整操作。
const emit = defineEmits<AppearanceSettingEmits>();
// 按下回车时结束编辑，并复用失焦保存逻辑。
function blurTitleInput(event: KeyboardEvent): void {
  (event.currentTarget as HTMLInputElement | null)?.blur();
}
// 校验并上报输入框提交的桌宠尺寸。
function updatePetSize(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  // 将用户输入限制在桌宠支持的尺寸区间内。
  const normalizedValue = clamp(Math.round(value), PET_SIZE_MIN, PET_SIZE_MAX);
  emit('update-pet-size', normalizedValue);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
