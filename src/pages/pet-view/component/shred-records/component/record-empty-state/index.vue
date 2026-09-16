<template>
  <div class="record-empty-state">
    <img
      class="record-empty-state-image"
      :src="emptyIllustration"
      alt=""
    />
    <span>{{ title }}</span>
  </div>
</template>
<script setup lang="ts">
import emptyIllustration from '@/styles/icons/empty.svg';
// 定义空记录状态的提示文案。
defineProps<{ title: string }>();
</script>
<style lang="less" scoped>
.record-empty-state {
  z-index: 100;
  position: absolute;
  top: 88px;
  left: 0;
  height: calc(100% - 88px);
  width: 100%;
  padding: 24px 0;
  background-color: #fff;
  font-size: 14px;
  color: #99a1ad;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .record-empty-state-image {
    height: 116px;
    width: 124px;
    margin-bottom: 8px;
  }
}
</style>
