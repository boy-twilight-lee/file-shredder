<template>
  <div class="shred-page">
    <shred-step-bar />
    <div class="shred-page-body">
      <step-drop-zone v-if="step === 'select'" />
      <step-confirm-list v-else-if="step === 'confirm'" />
      <step-progress v-else-if="step === 'progress'" />
      <step-result v-else />
    </div>
    <shred-confirm-modal />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useAppShellContext } from '@/layout';
import ShredConfirmModal from './component/shred-confirm-modal';
import ShredStepBar from './component/shred-step-bar';
import StepConfirmList from './component/step-confirm-list';
import StepDropZone from './component/step-drop-zone';
import StepProgress from './component/step-progress';
import StepResult from './component/step-result';
defineOptions({
  name: 'ShredPage',
});
// 读取外壳上下文中的任务当前步骤。
const { task } = useAppShellContext().inject();
// 当前展示的清理步骤，决定业务区渲染哪一个步骤组件。
const step = computed(() => task.step.value);
</script>
<style lang="less" scoped>
@import './index.less';
</style>
