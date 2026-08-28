<template>
  <settings-card
    class="pet-image-setting"
    title="桌宠形象"
    description="支持常用图片格式，单张不超过 50 MB。"
  >
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
          <icon-check />
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
            <icon-delete />
          </span>
        </a-popconfirm>
      </button>

      <button
        type="button"
        class="pet-image-setting-item pet-image-setting-item-upload"
        :disabled="isChoosingPetImage"
        @click="emit('choose-pet-image')"
      >
        <icon-plus />
        <span>{{ isChoosingPetImage ? '正在读取' : '上传图片' }}</span>
        <small>PNG · JPG · SVG · WebP · GIF</small>
      </button>
    </div>
  </settings-card>
</template>

<script setup lang="ts">
import type { PetImageSettingEmits, PetImageSettingProps } from './type';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
} from '@/components/pet-view/component/pet-bubble/constants';
import { SettingsCard } from '../settings-card';

defineProps<PetImageSettingProps>();
const emit = defineEmits<PetImageSettingEmits>();
</script>

<style lang="less" scoped>
@import './index.less';
</style>
