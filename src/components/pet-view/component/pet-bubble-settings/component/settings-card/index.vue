<template>
  <section
    class="settings-card"
    :class="`settings-card-${layout}`"
  >
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
    layout?: 'horizontal' | 'vertical';
  }>(),
  {
    title: '',
    description: '',
    layout: 'vertical',
  },
);
</script>

<style lang="less" scoped>
@import './index.less';
</style>
