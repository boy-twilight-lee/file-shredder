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
    >
      <img
        ref="spriteSheet"
        class="pet-character-sheet"
        :src="DEFAULT_PET_ATLAS"
        :style="atlasStyle"
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
import { usePetMotion } from './hooks';
import {
  DEFAULT_PET_ATLAS,
  PET_ANIMATIONS,
  PET_LOOK_FRAMES,
  PET_ATLAS_COLUMNS,
  PET_ATLAS_ROWS,
} from './constants';
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
// 原生事件统一管理方向，停止后短暂停留再恢复业务动作。
const { direction, isSettling } = usePetMotion(petMotion, isDefaultPet);
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
  if (direction.value === 0) return isSettling.value ? 'rest-right' : 'right';
  if (direction.value === 4) return isSettling.value ? 'rest-left' : 'left';
  if (direction.value !== null) return `look-${direction.value}`;
  if (visualPetState.value === 'working' || bubbleMode.value === 'progress')
    return 'working';
  if (visualPetState.value === 'failure') return 'failure';
  if (visualPetState.value === 'success') return 'success';
  if (bubbleMode.value === 'confirm') return 'waiting';
  if (bubbleMode.value === 'actions') return 'idle';
  if (bubbleMode.value !== 'hidden' && !summary.value?.cancelled)
    return 'review';
  return 'idle';
});
// 常驻图集元素，切换状态只更新帧坐标。
const spriteSheet = ref<HTMLImageElement | null>(null);
// 图集缩放和帧坐标使用同一份生成元数据，尺寸改变不会重新启动动画。
const atlasStyle = {
  width: `${PET_ATLAS_COLUMNS * 100}%`,
  height: `${PET_ATLAS_ROWS * 100}%`,
};
// 保存合成器动画，切换状态和卸载时释放。
let spriteAnimation: Animation | null = null;
// 保存正在播放的动作名，用于转向时延续同一脚步相位。
let playingKey = '';
// 将图集帧编号换算为图片自身尺寸的百分比位移。
function getFrameTransform(frame: number): string {
  return `translate(${(-(frame % PET_ATLAS_COLUMNS) * 100) / PET_ATLAS_COLUMNS}%, ${(-Math.floor(frame / PET_ATLAS_COLUMNS) * 100) / PET_ATLAS_ROWS}%)`;
}
// 原生拖动期间由 Chromium 合成器播放，避免依赖 JS 定时器推进动作。
function updateSpriteAnimation(): void {
  // 在取消旧动画前保存脚步相位，转向不再每次重播第一帧。
  const previousTime = Number(spriteAnimation?.currentTime ?? 0);
  // 只把左右跑步之间的转向作为同一循环延续。
  const wasWalking = playingKey === 'left' || playingKey === 'right';
  // 保存新动作，后续同方向事件不会再次触发本函数。
  const nextKey = animationKey.value;
  // 角色图片仅在用户选择自定义形象时移除。
  const sheet = spriteSheet.value;
  if (!sheet) {
    spriteAnimation?.cancel();
    spriteAnimation = null;
    playingKey = '';
    return;
  }
  // 所有动作共享图集，方向表情使用固定帧。
  const animation = PET_ANIMATIONS[nextKey];
  if (!animation) {
    sheet.style.transform = getFrameTransform(
      PET_LOOK_FRAMES[direction.value ?? 0],
    );
    spriteAnimation?.cancel();
    spriteAnimation = null;
    playingKey = nextKey;
    return;
  }
  // 动作支持逐帧停留时长，使眨眼、挥手和休息节奏不再完全等速。
  const frames = [...animation.frames];
  // 未单独指定时长的动作保持均匀的真实关键帧节奏。
  const holds = animation.holdsMs
    ? [...animation.holdsMs]
    : frames.map(() => animation.durationMs / frames.length);
  if (wasWalking && nextKey.startsWith('rest-')) {
    // 松手后先完成当前脚步，再保持收脚姿势，避免直接跳回正面。
    const walking = PET_ANIMATIONS[playingKey];
    frames.unshift(
      walking.frames[
        Math.floor(
          (previousTime % walking.durationMs) /
            (walking.durationMs / walking.frames.length),
        )
      ],
    );
    holds[0] -= 120;
    holds.unshift(120);
  }
  // 使用实际逐帧时长计算周期，避免配置总时长和停留时长不一致。
  const duration = holds.reduce((total, hold) => total + hold, 0);
  // 累计帧起点，用离散关键帧避免图片在格子之间滑动或混合。
  let elapsed = 0;
  // 每帧只有一个完整图像，不使用透明度交叉淡化。
  const keyframes = frames.map((frame, index) => {
    // 保存当前帧开始位置，再累计下一帧时间。
    const keyframe = {
      transform: getFrameTransform(frame),
      offset: elapsed / duration,
      easing: 'steps(1, end)',
    };
    elapsed += holds[index];
    return keyframe;
  });
  keyframes.push({
    transform: getFrameTransform(frames[frames.length - 1]),
    offset: 1,
    easing: 'steps(1, end)',
  });
  sheet.style.transform = getFrameTransform(frames[0]);
  spriteAnimation?.cancel();
  spriteAnimation = sheet.animate(keyframes, {
    duration,
    iterations: animation.loop ? Infinity : 1,
    fill: 'forwards',
  });
  if (wasWalking && (nextKey === 'left' || nextKey === 'right'))
    spriteAnimation.currentTime = previousTime % duration;
  playingKey = nextKey;
}
// DOM 保持不变，Vue 更新结束后在下一次绘制前同步设置首帧。
watch([animationKey, spriteSheet], updateSpriteAnimation, { flush: 'post' });
// 组件卸载时释放合成器动画资源。
onBeforeUnmount(() => spriteAnimation?.cancel());
// 点击人物时切换操作气泡面板。
function handleClick(): void {
  if (bubbleMode.value === 'hidden') openActions();
  else closeBubble();
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
