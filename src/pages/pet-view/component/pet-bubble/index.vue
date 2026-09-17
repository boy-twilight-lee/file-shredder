<template>
  <div
    :class="['pet-bubble', `shred-${visibleBubbleMode}`]"
    :style="bubbleSizeStyle"
    ref="bubbleElement"
  >
    <transition
      :css="false"
      @before-enter="handleBubbleBeforeEnter"
      @enter="handleBubbleEnter"
      @leave="handleBubbleLeave"
    >
      <pet-bubble-records v-show="visibleBubbleMode === 'records'" />
    </transition>
    <transition
      :css="false"
      @before-enter="handleBubbleBeforeEnter"
      @enter="handleBubbleEnter"
      @leave="handleBubbleLeave"
    >
      <pet-bubble-actions v-if="visibleBubbleMode === 'actions'" />
      <pet-bubble-settings v-else-if="visibleBubbleMode === 'settings'" />
      <pet-bubble-confirm v-else-if="visibleBubbleMode === 'confirm'" />
      <pet-bubble-progress v-else-if="visibleBubbleMode === 'progress'" />
      <pet-bubble-result v-else-if="visibleBubbleMode === 'result'" />
    </transition>
  </div>
</template>
<script setup lang="ts">
import { gsap } from 'gsap';
import { usePetViewContext } from '@/pages/pet-view/hooks';
import { PET_BUBBLE_MAX_SIZE } from '@/constants';
import {
  PetBubbleActions,
  PetBubbleConfirm,
  PetBubbleProgress,
  PetBubbleResult,
  PetBubbleSettings,
  PetBubbleRecords,
} from '@/pages/pet-view/component';
// 读取气泡容器引用与当前业务视图。
const { bubbleElement, bubbleMode } = usePetViewContext().inject();
// 保留最后一个可见业务视图，供 Trigger 完成气泡退场动画。
const visibleBubbleMode = ref(bubbleMode.value);
// 设置使用移动端尺寸，记录页面铺满最大气泡区域，其余页面按内容自适应。
const bubbleSizeStyle = computed<Record<string, string>>(() => {
  // 保存固定尺寸气泡需要的内联样式，其余页面保持空对象按内容自适应。
  const style: Record<string, string> = {};
  if (visibleBubbleMode.value === 'records') {
    style.height = `${PET_BUBBLE_MAX_SIZE.height}px`;
    style.width = `${PET_BUBBLE_MAX_SIZE.width}px`;
  }
  return style;
});
// 在新气泡页面进入前准备透明度起点，并终止同一节点上的遗留补间。
function handleBubbleBeforeEnter(element: Element): void {
  // 将 Vue 传入的过渡元素收窄为可执行样式动画的节点。
  const bubbleView = element as HTMLElement;
  gsap.killTweensOf(bubbleView);
  gsap.set(bubbleView, { opacity: 0.68 });
}
// 使用 GSAP 淡入新气泡页面，并在完成后通知 Vue 结束进入阶段。
function handleBubbleEnter(element: Element, done: () => void): void {
  // 将 Vue 传入的过渡元素收窄为可执行样式动画的节点。
  const bubbleView = element as HTMLElement;
  gsap.to(bubbleView, {
    duration: 0.3,
    opacity: 1,
    ease: 'power2.out',
    overwrite: 'auto',
    clearProps: 'opacity',
    onComplete: done,
  });
}
// 立即结束旧气泡页面并清理补间，避免切换期间两个面板叠加闪动。
function handleBubbleLeave(element: Element, done: () => void): void {
  // 将 Vue 传入的过渡元素收窄为需要立即隐藏的节点。
  const bubbleView = element as HTMLElement;
  gsap.killTweensOf(bubbleView);
  gsap.set(bubbleView, { display: 'none' });
  done();
}
// 气泡关闭时保留当前内容，避免淡出阶段提前卸载。
watch(bubbleMode, (mode) => {
  if (mode !== 'hidden') visibleBubbleMode.value = mode;
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
