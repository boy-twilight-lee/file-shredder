<template>
  <a-modal
    v-model:visible="visible"
    :width="520"
    title="清理确认"
    ok-text="确认清除"
    cancel-text="取消"
    @ok="handleConfirm"
  >
    <div class="shred-modal">
      <div class="shred-modal-row">
        <span class="shred-modal-label">清理目标</span>
        <span class="shred-modal-value">共 {{ targetCount }} 项</span>
      </div>
      <div class="shred-modal-row">
        <span class="shred-modal-label">清理级别</span>
        <a-tag class="correct">{{ passesLabel }}</a-tag>
      </div>
      <a-tag class="error">清理后数据不可恢复，请确认目标无误后再执行</a-tag>
    </div>
  </a-modal>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { SHRED_PASSES_LABELS } from '@/constants';
import { useAppShellContext } from '@/layout';
defineOptions({
  name: 'ShredConfirmModal',
});
// 读取外壳上下文中的任务状态与确认动作。
const { task } = useAppShellContext().inject();
// 弹窗显示状态，所有关闭路径统一交回任务状态机处理。
const visible = computed<boolean>({
  get: () => task.isConfirmVisible.value,
  set: (value) => {
    if (!value) task.dismissConfirm();
  },
});
// 本次待清理的目标数量，取勾选快照。
const targetCount = computed(() => task.selectedPaths.value.length);
// 本次清理使用的级别文案。
const passesLabel = computed(() => SHRED_PASSES_LABELS[task.passes.value]);
// 确认后启动清理任务，弹窗由任务状态机同步关闭。
async function handleConfirm(): Promise<void> {
  await task.confirmShred();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
