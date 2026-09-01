<template>
  <section class="settings-card">
    <header
      v-if="title || description || $slots.header"
      class="settings-card-header"
    >
      <slot name="header">
        <h2
          v-if="title"
          class="settings-card-title"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="settings-card-description"
        >
          {{ description }}
        </p>
      </slot>
    </header>
    <div class="settings-card-content">
      <slot />
    </div>
  </section>
</template>
<script setup lang="ts">
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
  min-width: 0;
  padding: var(--settings-card-padding, 16px);
  background: #fff;
  border: 1px solid #e7ebf0;
  border-radius: 12px;
  box-shadow: 0 5px 18px rgba(30, 55, 90, 0.045);
  display: flex;
  flex-direction: column;
  gap: 12px;
  .settings-card-header {
    min-width: 0;
    .settings-card-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      line-height: 22px;
    }
    .settings-card-description {
      overflow: hidden;
      margin: 4px 0 0;
      font-size: 12px;
      line-height: 1.6;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #79828f;
    }
  }
  .settings-card-content {
    min-width: 0;
    flex: 1;
  }
}
</style>
