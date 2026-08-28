<template>
  <settings-card
    class="pet-size-setting"
    title="桌宠大小"
    description="调整桌宠显示大小。"
  >
    <div class="pet-size-setting-controls">
      <a-slider
        class="pet-size-setting-slider"
        :model-value="modelValue"
        :min="PET_SIZE_MIN"
        :max="PET_SIZE_MAX"
        :step="PET_SIZE_STEP"
        @change="updatePetSizeFromSlider"
      />
      <div class="pet-size-setting-input">
        <a-input-number
          :model-value="modelValue"
          :min="PET_SIZE_MIN"
          :max="PET_SIZE_MAX"
          :step="PET_SIZE_STEP"
          hide-button
          @change="updatePetSize"
        />
        <span>px</span>
      </div>
    </div>
  </settings-card>
</template>

<script setup lang="ts">
import { PET_SIZE_MAX, PET_SIZE_MIN, PET_SIZE_STEP } from './constants';
import { SettingsCard } from '../settings-card';

defineProps<{ modelValue: number }>();
const emit = defineEmits<{ 'update-pet-size': [value: number] }>();

function updatePetSize(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  const normalizedValue = Math.min(
    PET_SIZE_MAX,
    Math.max(PET_SIZE_MIN, Math.round(value)),
  );
  emit('update-pet-size', normalizedValue);
}

function updatePetSizeFromSlider(value: number | [number, number]): void {
  // 当前控件使用单值滑块，显式收窄 Arco Slider 的区间联合类型。
  if (typeof value === 'number') updatePetSize(value);
}
</script>

<style lang="less" scoped>
@import './index.less';
</style>
