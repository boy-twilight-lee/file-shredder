<template>
  <div
    :class="['pet-character', `pet-character-${visualPetState}`]"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
  >
    <div
      v-if="isDefaultPet"
      class="pet-character-sprite"
      :style="facingStyle"
    >
      <img
        :key="animationKey"
        class="pet-character-sheet"
        :src="animationImage"
        :style="spriteStyle"
        alt="默认黄色桌宠"
        draggable="false"
      />
    </div>
    <img
      v-else
      class="pet-character-image"
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
import { useRafFn } from '@vueuse/core';
import { getPetDirection } from '@/utils';
import { PET_ANIMATIONS, PET_LOOK_FRAMES } from './constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PetCharacterDrag } from './component';
// 定义气泡打开时是否显示原生桌宠拖动入口。
defineProps<{ dragButtonVisible: boolean }>();
// 读取桌宠状态与人物交互能力。
const {
  petState,
  bubbleMode,
  summary,
  petImageSource,
  isDefaultPet,
  petMotion,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext().inject();
// 保留前一显示帧的窗口屏幕位置，只观察原生拖动，不写入窗口位置。
let previousPosition = { x: window.screenX, y: window.screenY };
// 保存最近检测到窗口移动的时间，用于原生结束事件的超时兜底。
let lastMotionAt = 0;
// 从窗口实际位置补充方向反馈，避免只依赖主进程事件往返。
useRafFn(({ timestamp }) => {
  // 获取 Chromium 当前已同步的原生窗口位置。
  const position = { x: window.screenX, y: window.screenY };
  // 计算相邻显示帧间的实际屏幕位移。
  const motion = {
    x: position.x - previousPosition.x,
    y: position.y - previousPosition.y,
  };
  previousPosition = position;
  if (!isDefaultPet.value) return;
  if (Math.hypot(motion.x, motion.y) >= 2) {
    petMotion.value = motion;
    lastMotionAt = timestamp;
  } else if (lastMotionAt && timestamp - lastMotionAt > 180) {
    petMotion.value = null;
    lastMotionAt = 0;
  }
});
// 将实际移动量映射为八个视觉方向。
const direction = computed(() => getPetDirection(petMotion.value));
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
// 为每个动作选择高清多帧序列，方向切换立即生效。
const animationKey = computed(() => {
  if (direction.value === 0) return 'right';
  if (direction.value === 4) return 'left';
  if (direction.value !== null) return `look-${direction.value}`;
  if (visualPetState.value === 'working' || bubbleMode.value === 'progress')
    return 'working';
  if (visualPetState.value === 'failure') return 'failure';
  if (visualPetState.value === 'success') return 'success';
  if (bubbleMode.value === 'confirm') return 'waiting';
  if (bubbleMode.value === 'actions') return 'review';
  if (bubbleMode.value !== 'hidden' && !summary.value?.cancelled)
    return 'review';
  return 'idle';
});
// 左向姿势仅镜像默认人物，保留自定义图片的原始方向。
const facingStyle = computed(() => ({
  transform: direction.value === 4 ? 'scaleX(-1)' : 'none',
}));
// 选择独立动作纹理，默认图集不经过 IPC 重复传输。
const animationImage = computed(
  () =>
    PET_ANIMATIONS[
      animationKey.value.startsWith('look-') ? 'look' : animationKey.value
    ].image,
);
// 用合成器的离散动画播放高清帧，原生拖拽期间无需 JS 定时器推进。
const spriteStyle = computed(() => {
  if (
    direction.value !== null &&
    direction.value !== 0 &&
    direction.value !== 4
  ) {
    // 将八方向姿态定位到图集中的固定网格。
    const frame = PET_LOOK_FRAMES[direction.value];
    return {
      animation: 'none',
      transform: `translate(${-(frame % 4) * 25}%, ${-Math.floor(frame / 4) * 25}%)`,
    };
  }
  // 读取当前业务动作的节奏和循环策略。
  const animation = PET_ANIMATIONS[animationKey.value];
  if (!animation.durationMs)
    return { animation: 'none', transform: 'translate(0, 0)' };
  return {
    '--pet-duration': `${animation.durationMs}ms`,
    '--pet-repeat': animation.loop ? 'infinite' : '1',
  };
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
