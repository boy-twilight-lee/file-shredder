<template>
  <div class="shred-confirm">
    <div class="shred-confirm-card">
      <div class="shred-confirm-card-header">
        <span class="shred-confirm-card-title">待清除目标</span>
      </div>
      <div class="shred-confirm-card-body">
        <cx-table
          v-model:select-keys="selectedPaths"
          :data="rows"
          :columns="columns"
          row-key="id"
          :show-pagination="false"
          empty-text="还没有待清除目标"
        >
          <template #name="{ row }">
            <div class="shred-confirm-name">
              <app-file-icon
                class="shred-confirm-name-icon"
                :path="row.path"
                :target-type="row.targetType"
              />
              <span class="shred-confirm-name-text">{{ row.name }}</span>
            </div>
          </template>
          <template #opera="{ row }">
            <a-button
              type="text"
              @click="handleRemove(row.path)"
            >
              <template #icon>
                <svg-icon
                  name="icon-remove"
                  :size="16"
                />
              </template>
              移除
            </a-button>
          </template>
        </cx-table>
      </div>
    </div>
    <div class="shred-confirm-bar">
      <span class="shred-confirm-bar-count">{{ selectedSummary }}</span>
      <div class="shred-confirm-bar-actions">
        <a-button
          type="outline"
          status="danger"
          :disabled="selectedPaths.length === 0"
          @click="handleRemoveSelected"
        >
          删除选中
        </a-button>
        <a-button
          type="primary"
          :disabled="selectedPaths.length === 0"
          @click="handleShred"
        >
          确认清除
        </a-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { TableColumnData } from '@/components';
import { useAppShellContext } from '@/layout';
import { toShredTargetRow } from '@/utils';
defineOptions({
  name: 'StepConfirmList',
});
// 读取外壳上下文中的目标草稿与相关动作。
const { task } = useAppShellContext().inject();
// 表格列定义：勾选列与操作列由 cx-table 固定宽度，其余按设计稿取值。
const columns: TableColumnData[] = [
  { type: 'selection' },
  { prop: 'name', label: '目标名称' },
  { prop: 'location', label: '所在位置', width: 280 },
  { prop: 'size', label: '大小', width: 110 },
  { prop: 'opera', label: '操作' },
];
// 草稿目标转换得到的表格行数据。
const rows = computed(() => task.targets.value.map(toShredTargetRow));
// 与草稿选中集合双向同步的表格勾选值。
const selectedPaths = computed<string[]>({
  get: () => task.selectedPaths.value,
  set: (paths) => task.setSelectedPaths(paths),
});
// 底部操作栏左侧的计数文案。
const selectedSummary = computed(
  () =>
    `共 ${task.targets.value.length} 项，已选 ${task.selectedPaths.value.length} 项`,
);
// 从草稿中移除单个目标。
function handleRemove(path: string): void {
  task.removeTargets([path]);
}
// 从草稿中移除当前勾选的全部目标。
function handleRemoveSelected(): void {
  task.removeSelectedTargets();
}
// 请求开始清理，按设置决定是否先弹出确认弹窗。
function handleShred(): void {
  task.requestShred();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
