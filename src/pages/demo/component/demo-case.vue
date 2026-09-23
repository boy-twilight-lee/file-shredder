<template>
  <div class="demo-case">
    <div class="demo-case-head">
      <span class="demo-case-title">{{ title }}</span>
      <span v-if="description" class="demo-case-desc">{{ description }}</span>
    </div>
    <div class="demo-case-body">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts">
defineOptions({
  name: 'DemoCase',
});
// 描述单个示例卡片的标题与用法说明。
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
.demo-case {
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #fff;
  .demo-case-head {
    padding: 10px 16px;
    border-bottom: 1px solid #f2f5fa;
    background: #fafbfc;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    .demo-case-title {
      color: #0d1014;
      font-size: 14px;
      font-weight: 500;
    }
    .demo-case-desc {
      color: #79828f;
      font-size: 12px;
      line-height: 18px;
    }
  }
  .demo-case-body {
    padding: 16px;
  }
}
</style>
