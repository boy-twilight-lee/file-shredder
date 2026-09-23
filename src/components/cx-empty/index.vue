<template>
  <div class="cx-empty">
    <slot name="image">
      <div
        v-if="imgSrc"
        class="cx-empty-image"
      >
        <img
          :src="imgSrc"
          alt="图片加载失败"
        />
      </div>
      <div
        v-else
        class="cx-empty-image"
        style="width: 200px; height: 200px"
      >
        <img
          :src="Empty"
          style="width: 183px; height: 171px"
        />
      </div>
    </slot>
    <div
      v-if="description"
      class="cx-empty-description"
    >
      <slot name="description">
        {{ description }}
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Empty from '@/styles/icons/empty.svg';
defineOptions({
  name: 'Empty',
});
withDefaults(
  defineProps<{
    description?: string;
    imgSrc?: string;
  }>(),
  {
    description: '暂无数据',
    imgSrc: '',
  },
);
</script>

<style lang="less" scoped>
@import './index.less';
</style>
