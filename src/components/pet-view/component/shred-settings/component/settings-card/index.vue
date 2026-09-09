<template>
  <div class="settings-card">
    <div
      v-if="title || description || $slots.header"
      class="settings-card-header"
    >
      <slot name="header">
        <span
          v-if="title"
          class="settings-card-title"
        >
          {{ title }}
        </span>
        <span
          v-if="description"
          class="settings-card-desc"
        >
          {{ description }}
        </span>
      </slot>
    </div>
    <div class="settings-card-content">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
// 定义设置卡片可选的标题与辅助说明。
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
  }>(),
  {
    title: '',
    description: '',
  },
);
</script>
<style lang="less" scoped>
.settings-card {
  padding: var(--settings-card-padding, 16px);
  background: #fff;
  border: 1px solid #e7ebf0;
  border-radius: 12px;
  box-shadow: 0 5px 18px rgba(30, 55, 90, 0.045);
  display: flex;
  flex-direction: column;
  gap: 16px;
  .settings-card-header {
    .settings-card-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 20px;
      display: block;
    }
    .settings-card-desc {
      overflow: hidden;
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 18px;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #79828f;
      display: block;
    }
  }
  .settings-card-content {
    flex: 1;
  }
}
</style>
