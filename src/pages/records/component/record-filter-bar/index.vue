<template>
  <div class="record-filter">
    <div class="record-filter-group">
      <span class="record-filter-label">目标名称</span>
      <a-input
        v-model="keyword"
        class="record-filter-control record-filter-control-keyword"
        placeholder="搜索目标路径"
        allow-clear
      />
      <span class="record-filter-label">清理结果</span>
      <a-select
        v-model="result"
        class="record-filter-control"
        :options="resultOptions"
      />
      <span class="record-filter-label">清理级别</span>
      <a-select
        v-model="passes"
        class="record-filter-control"
        :options="passesOptions"
      />
      <span class="record-filter-label">时间范围</span>
      <a-select
        v-model="range"
        class="record-filter-control"
        :options="rangeOptions"
      />
      <a-button
        type="primary"
        @click="handleQuery"
      >
        查询
      </a-button>
    </div>
    <div class="record-filter-actions">
      <a-button @click="handleReset">重置</a-button>
      <a-button @click="handleExport">导出记录</a-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import {
  SHRED_PASSES_FILTER_OPTIONS,
  SHRED_RANGE_FILTER_OPTIONS,
  SHRED_RESULT_FILTER_OPTIONS,
} from '@/constants';
import {
  ShredLogFilter,
  ShredLogFilterResult,
  ShredLogRangePreset,
  ShredPasses,
} from '@/type';
import { resolveLogRange } from '@/utils';
defineOptions({
  name: 'RecordFilterBar',
});
const emits = defineEmits<{
  (e: 'query', filter: ShredLogFilter): void;
  (e: 'reset'): void;
  (e: 'export'): void;
}>();
// 清理结果下拉的候选项。
const resultOptions = SHRED_RESULT_FILTER_OPTIONS;
// 清理级别下拉的候选项。
const passesOptions = SHRED_PASSES_FILTER_OPTIONS;
// 时间范围下拉的候选项。
const rangeOptions = SHRED_RANGE_FILTER_OPTIONS;
// 目标名称的模糊搜索关键字。
const keyword = ref('');
// 清理结果筛选值。
const result = ref<ShredLogFilterResult>('all');
// 清理级别筛选值，`all` 表示不限制。
const passes = ref<ShredPasses | 'all'>('all');
// 时间范围筛选档位。
const range = ref<ShredLogRangePreset>('all');
// 组装当前筛选条件并交给页面执行查询。
function handleQuery(): void {
  emits('query', {
    keyword: keyword.value,
    result: result.value,
    passes: passes.value,
    range: resolveLogRange(range.value),
  });
}
// 清空全部筛选条件并通知页面回到未筛选状态。
function handleReset(): void {
  keyword.value = '';
  result.value = 'all';
  passes.value = 'all';
  range.value = 'all';
  emits('reset');
}
// 通知页面导出当前筛选结果。
function handleExport(): void {
  emits('export');
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
