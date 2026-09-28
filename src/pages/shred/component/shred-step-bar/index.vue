<template>
  <div class="shred-step-bar">
    <a-steps
      :current="current"
      small
      line-less
    >
      <a-step
        v-for="item in steps"
        :key="item.key"
        :title="item.label"
      />
    </a-steps>
  </div>
</template>
<script setup lang="ts">
import { SHRED_STEPS } from '@/constants';
import { useAppShellContext } from '@/layout';
defineOptions({
  name: 'ShredStepBar',
});
// 步骤条展示的全部步骤。
const steps = SHRED_STEPS;
// 读取外壳上下文中的任务当前步骤下标。
const { task } = useAppShellContext().inject();
// 步骤条当前高亮的步骤下标。
const current = task.stepIndex;
</script>
<style lang="less" scoped>
@import './index.less';
</style>
