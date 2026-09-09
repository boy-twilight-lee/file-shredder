<template>
  <div
    class="pet-character"
    :class="`pet-character-${visualPetState}`"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
  >
    <img
      class="pet-character-image"
      :class="`pet-character-image-${visualPetState}`"
      :src="petImageSource"
      alt="桌宠人物"
      draggable="false"
      @load="handlePetImageLoad"
    />
    <transition name="fade-in">
      <pet-character-drag v-if="dragButtonVisible" />
    </transition>
  </div>
</template>
<script setup lang="ts">
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PetCharacterDrag } from './component';
// 定义气泡打开时是否显示桌宠拖动入口。
defineProps<{ dragButtonVisible: boolean }>();
// 读取桌宠共享状态与人物交互能力。
const {
  petState,
  bubbleMode,
  summary,
  petImageSource,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext().inject();
// 将任务结果与临时状态映射为人物视觉状态。
const visualPetState = computed(() => {
  if (bubbleMode.value === 'result') {
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  return petState.value === 'success' || petState.value === 'failure'
    ? 'idle'
    : petState.value;
});
// 点击人物时切换操作气泡面板。
function handleClick(): void {
  if (bubbleMode.value === 'hidden') openActions();
  else closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
