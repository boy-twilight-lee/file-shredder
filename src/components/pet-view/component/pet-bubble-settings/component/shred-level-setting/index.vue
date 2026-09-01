<template>
  <settings-card
    class="shred-level-setting"
    title="选择文件清理强度"
    description="覆写次数越多越安全，处理时间也越长。"
  >
    <div
      class="shred-level-setting-list"
      role="radiogroup"
      aria-label="文件清理强度"
    >
      <button
        v-for="item in SHRED_LEVEL_OPTIONS"
        :key="item.value"
        type="button"
        role="radio"
        class="shred-level-setting-item"
        :class="{
          'shred-level-setting-item-active': modelValue === item.value,
        }"
        :aria-checked="modelValue === item.value"
        @click="emit('update-passes', item.value)"
      >
        <span class="shred-level-setting-icon">
          <svg-icon :name="SHRED_LEVEL_ICONS[item.value]" />
        </span>
        <span class="shred-level-setting-content">
          <span class="shred-level-setting-title">
            <strong>{{ item.title }}</strong>
            <em>{{ item.badge }}</em>
          </span>
          <small>{{ item.description }}</small>
        </span>
        <span
          v-if="modelValue === item.value"
          class="shred-level-setting-check"
        >
          <svg-icon name="app-check" />
        </span>
      </button>
    </div>
  </settings-card>
</template>
<script setup lang="ts">
import type { AppSettings } from '@/type';
import { SHRED_LEVEL_ICONS, SHRED_LEVEL_OPTIONS } from './constants';
import SettingsCard from '../settings-card.vue';
defineProps<{ modelValue: AppSettings['passes'] }>();
// 向设置页上报用户选择的清理强度。
const emit = defineEmits<{
  'update-passes': [value: AppSettings['passes']];
}>();
</script>
<style lang="less" scoped>
@import './index.less';
</style>
