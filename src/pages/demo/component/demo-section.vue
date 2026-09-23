<template>
  <div class="demo-section">
    <div class="demo-section-head">
      <div class="demo-section-heading">
        <i class="demo-section-mark" />
        <span class="demo-section-title">{{ title }}</span>
      </div>
      <span v-if="description" class="demo-section-desc">{{ description }}</span>
      <slot name="extra" />
    </div>
    <div class="demo-section-body">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: 'DemoSection',
});
// 描述 demo 内容大区的标题与整体说明。
withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  {
    description: '',
  },
);
</script>
<style lang="less" scoped>
.demo-section {
  .demo-section-head {
    margin-bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    .demo-section-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      .demo-section-mark {
        width: 4px;
        height: 16px;
        border-radius: 2px;
        background: #0065ff;
      }
      .demo-section-title {
        color: #0d1014;
        font-size: 18px;
        font-weight: 500;
      }
    }
    .demo-section-desc {
      color: #79828f;
      font-size: 13px;
      line-height: 20px;
    }
  }
}
</style>
