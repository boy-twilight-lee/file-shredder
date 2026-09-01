<template>
  <settings-card
    class="pet-image-setting"
    title="桌宠"
  >
    <span class="pet-image-setting-section-label">桌宠形象</span>
    <div class="pet-image-setting-list">
      <button
        v-for="item in petImageTemplates"
        :key="item.id"
        type="button"
        class="pet-image-setting-item"
        :class="{ 'pet-image-setting-item-active': item.active }"
        @click="emit('select-pet-image', item.id)"
      >
        <span class="pet-image-setting-preview">
          <img
            :src="item.image"
            :alt="item.name"
          />
        </span>
        <span
          class="pet-image-setting-name"
          :title="item.name"
        >
          {{ item.name }}
        </span>
        <span
          v-if="item.active"
          class="pet-image-setting-selected"
        >
          <svg-icon name="app-check" />
        </span>
        <a-popconfirm
          v-if="item.deletable"
          content="删除这个自定义形象？"
          content-class="pet-bubble-settings-popconfirm"
          type="error"
          :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
          :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
          @ok="emit('delete-pet-image', item.id)"
        >
          <span
            class="pet-image-setting-delete"
            title="删除"
            @click.stop
          >
            <svg-icon name="app-delete" />
          </span>
        </a-popconfirm>
      </button>
      <button
        type="button"
        class="pet-image-setting-item pet-image-setting-item-upload"
        :disabled="isChoosingPetImage"
        @click="emit('choose-pet-image')"
      >
        <svg-icon name="app-add" />
        <span>{{ isChoosingPetImage ? '正在读取' : '上传图片' }}</span>
      </button>
    </div>
    <div class="pet-image-setting-size-row">
      <span class="pet-image-setting-size-label">桌宠大小</span>
      <div class="pet-image-setting-size-controls">
        <a-slider
          class="pet-image-setting-size-slider"
          :model-value="petSize"
          :min="PET_SIZE_MIN"
          :max="PET_SIZE_MAX"
          :step="PET_SIZE_STEP"
          @change="updatePetSizeFromSlider"
        />
        <div class="pet-image-setting-size-input">
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
  </settings-card>
</template>
<script setup lang="ts">
import { PetImageSettingEmits, PetImageSettingProps } from './type';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/pet-view/component/pet-bubble/constants';
import { clamp } from '@/utils';
import { PET_SIZE_MAX, PET_SIZE_MIN, PET_SIZE_STEP } from './constants';
import SettingsCard from '../settings-card.vue';
defineProps<PetImageSettingProps>();
// 向设置页上报形象管理与桌宠尺寸更新操作。
const emit = defineEmits<PetImageSettingEmits>();
// 校验并上报输入框提交的桌宠尺寸。
function updatePetSize(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  // 将用户输入限制在桌宠支持的尺寸区间内。
  const normalizedValue = clamp(Math.round(value), PET_SIZE_MIN, PET_SIZE_MAX);
  emit('update-pet-size', normalizedValue);
}
// 将单值滑块结果转交给统一尺寸更新逻辑。
function updatePetSizeFromSlider(value: number | [number, number]): void {
  // 当前控件使用单值滑块，显式收窄 Arco Slider 的区间联合类型。
  if (typeof value === 'number') updatePetSize(value);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
