<template>
  <div class="setting-row">
    <div class="setting-row-info">
      <span class="setting-row-title">{{ title }}</span>
      <span class="setting-row-description">{{ description }}</span>
    </div>
    <div class="setting-row-control">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: 'SettingRow',
});
defineProps<{
  title: string;
  description: string;
}>();
</script>
<style lang="less" scoped>
@import './index.less';
</style>
