<template>
  <cx-card
    title="外观设置"
    class="appearance-setting"
  >
    <div class="appearance-setting-list">
      <cx-layout
        class="appearance-setting-item"
        direction="horizontal"
        title="桌宠形象"
        size="compact"
      >
        <div class="appearance-setting-image-item appearance-setting-image-pet">
          <span class="appearance-setting-image-view">
            <img
              class="appearance-setting-image"
              :src="petImageSource"
              alt="桌宠形象"
            />
          </span>
          <div class="appearance-setting-image-tools">
            <button
              class="appearance-setting-image-tool"
              type="button"
              title="更换桌宠形象"
              aria-label="更换桌宠形象"
              :disabled="isChoosingPetImage || isRestoringPetImage"
              @click.stop="choosePetImage"
            >
              <svg-icon name="icon-edit" />
            </button>
            <button
              v-if="isCustomPetImage"
              class="appearance-setting-image-tool"
              type="button"
              title="恢复默认桌宠形象"
              aria-label="恢复默认桌宠形象"
              :disabled="isChoosingPetImage || isRestoringPetImage"
              @click.stop="restoreDefaultPetImage"
            >
              <svg-icon name="icon-restore" />
            </button>
          </div>
        </div>
      </cx-layout>
      <cx-layout
        class="appearance-setting-item"
        direction="horizontal"
        tag="label"
        title="桌宠大小"
        size="compact"
      >
        <a-input-number
          :model-value="settings.petSize"
          :min="PET_SIZE_MIN"
          :max="PET_SIZE_MAX"
          :step="PET_SIZE_STEP"
          hide-button
          class="appearance-setting-size-input"
          @change="handlePetSizeChange"
        >
          <template #suffix>
            <span class="appearance-setting-size-unit">px</span>
          </template>
        </a-input-number>
      </cx-layout>
      <cx-layout
        class="appearance-setting-item"
        direction="horizontal"
        title="气泡方向"
        size="compact"
      >
        <a-radio-group
          :model-value="settings.bubbleDirection"
          :options="BUBBLE_DIRECTION_OPTIONS"
          type="button"
          @change="handleBubbleDirectionChange"
        >
          <template #label="{ data }">
            <svg-icon
              :name="data.icon"
              :size="16"
            />
          </template>
        </a-radio-group>
      </cx-layout>
      <cx-layout
        class="appearance-setting-item"
        direction="horizontal"
        title="气泡对齐"
        size="compact"
      >
        <a-radio-group
          :model-value="settings.bubbleAlign"
          :options="BUBBLE_ALIGN_OPTIONS"
          type="button"
          @change="handleBubbleAlignChange"
        >
          <template #label="{ data }">
            <svg-icon
              :name="data.icon"
              :size="16"
            />
          </template>
        </a-radio-group>
      </cx-layout>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { clamp } from '@/utils';
import {
  BUBBLE_ALIGN_OPTIONS,
  BUBBLE_DIRECTION_OPTIONS,
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_STEP,
} from '../../constants';
import { useShredSettingsContext } from '../../hooks';
import CxCard from '@/components/cx-card';
import CxLayout from '@/components/cx-layout';
// 读取设置页共享的外观状态与保存操作。
const {
  settings,
  petImageSource,
  isCustomPetImage,
  isChoosingPetImage,
  isRestoringPetImage,
  choosePetImage,
  restoreDefaultPetImage,
  updatePetSize,
  updateBubbleDirection,
  updateBubbleAlign,
} = useShredSettingsContext().inject();
// 校验并上报用户选择的气泡方位。
function handleBubbleDirectionChange(value: string | number | boolean): void {
  if (value === 'left' || value === 'right') updateBubbleDirection(value);
}
// 校验并上报用户选择的气泡对齐方式。
function handleBubbleAlignChange(value: string | number | boolean): void {
  if (value === 'top' || value === 'center' || value === 'bottom')
    updateBubbleAlign(value);
}
// 校验并上报输入框提交的桌宠尺寸。
function handlePetSizeChange(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  // 将用户输入限制在桌宠支持的尺寸区间内。
  const normalizedValue = clamp(Math.round(value), PET_SIZE_MIN, PET_SIZE_MAX);
  updatePetSize(normalizedValue);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
