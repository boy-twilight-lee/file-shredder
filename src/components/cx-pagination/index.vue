<template>
  <div class="cx-pagination">
    <a-pagination
      v-model:current="current"
      v-model:page-size="pageSize"
      :total="total"
      :page-size-options="sizes"
      show-page-size
      show-jumper
      v-bind="$attrs"
    >
      <template #page-item-step="{ type }">
        <svg-icon :name="`icon-page-${type == 'previous' ? 'pre' : 'next'}`" />
      </template>
      <template #page-item-ellipsis>
        <div class="pagination-item-ellipsis-icon">
          <svg-icon
            name="icon-page-more-hover"
            class="more-hover-icon"
          />
          <svg-icon
            name="icon-page-more"
            class="more-icon"
          />
        </div>
      </template>
    </a-pagination>
  </div>
</template>

<script lang="ts" setup>
import { toRefs, computed } from 'vue';
const props = withDefaults(
  defineProps<{
    current?: number;
    pageSize?: number;
    total?: number;
    sizes?: number[];
  }>(),
  {
    current: 1,
    pageSize: 10,
    total: 0,
    sizes: () => [10, 20, 50, 100],
  },
);
const emits = defineEmits<{
  (e: 'change', value: number): void;
  (e: 'page-size-change', value: number): void;
}>();
const { current: _current, pageSize: _pageSize } = toRefs(props);
const current = computed({
  get() {
    return _current.value;
  },
  set(val) {
    emits('change', val);
  },
});
const pageSize = computed({
  get() {
    return _pageSize.value;
  },
  set(val) {
    emits('page-size-change', val);
  },
});
</script>

<style lang="less" scoped>
@import './index.less';
</style>
