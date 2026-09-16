<template>
  <div
    :class="[
      'pet-character',
      `pet-character-${pose}`,
      `pet-character-aligned-${bubbleAlign}`,
      { 'pet-character-aligned-left': isBubbleOnRight },
    ]"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
  >
    <img
      v-if="isDefaultPet"
      class="pet-character-image"
      :src="displayedSource"
      :data-pose="displayedPose"
      alt="默认黄色桌宠"
      draggable="false"
    />
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
import { PetPose } from './type';
import { usePetMotion } from './hooks';
import {
  DEFAULT_PET_PREVIEW,
  MOVEMENT_PRELOAD_POSES,
  PET_POSE_IMAGES,
} from './constants';
import { usePetViewContext } from '@/components/pet-view/hooks';
import { PetCharacterDrag } from './component';
// 定义气泡打开时是否显示原生桌宠拖动入口。
defineProps<{ dragButtonVisible: boolean }>();
// 读取业务页面、任务结果、用户选择的桌宠形象与气泡方位。
const {
  petState,
  bubbleMode,
  summary,
  errorMessage,
  petImageSource,
  isDefaultPet,
  petMotion,
  bubbleDirection,
  bubbleAlign,
  openActions,
  closeBubble,
  handlePetImageLoad,
} = usePetViewContext().inject();
// 标识操作气泡是否位于人物右侧，人物需要因此贴向窗口另一侧。
const isBubbleOnRight = computed(() => bubbleDirection.value === 'right');
// 原生方向覆盖业务姿势，松手后自动恢复当前页面对应的图片。
const { direction, isSettling } = usePetMotion(petMotion, isDefaultPet);
// 结果页优先于可能晚到的工作状态，取消任务也保持静态姿势。
const pose = computed<PetPose>(() => {
  if (direction.value !== null) {
    if (isSettling.value)
      return direction.value === 'left' ? 'restLeft' : 'restRight';
    return direction.value;
  }
  if (bubbleMode.value === 'result') {
    if (errorMessage.value) return 'failure';
    if (summary.value?.cancelled) return 'idle';
    return summary.value?.failed ? 'failure' : 'success';
  }
  if (bubbleMode.value === 'progress') return 'working';
  if (bubbleMode.value === 'confirm') return 'waiting';
  if (bubbleMode.value === 'actions') return 'actions';
  if (bubbleMode.value !== 'hidden') return 'idle';
  return petState.value === 'working' ? 'working' : 'idle';
});
// 解码下一张图片之前保留当前画面，避免快速切换出现空白。
const displayedSource = ref(DEFAULT_PET_PREVIEW);
// 姿势标识与已经解码并提交的图片保持一致。
const displayedPose = ref<PetPose>('idle');
// 每个组件缓存解码中的图片，避免同方向事件重复加载。
const decodedImages = new Map<string, Promise<boolean>>();
// 递增请求版本，阻止较慢的旧图片覆盖新的业务状态。
let imageRequest = 0;
// 在浏览器完成首帧解码后才允许切换图片，错误时保留静态预览。
async function decodeImage(source: string): Promise<boolean> {
  try {
    // 临时图片用于预解码，不会插入 DOM 或接管原生拖动。
    const image = new Image();
    image.src = source;
    await image.decode();
    return true;
  } catch {
    return false;
  }
}
// 合并重复加载请求，失败时允许下次进入状态重新尝试。
async function loadImage(source: string): Promise<boolean> {
  if (!decodedImages.has(source))
    decodedImages.set(source, decodeImage(source));
  // 读取已经创建的解码任务，同一素材只解码一次。
  const loaded = await decodedImages.get(source);
  if (!loaded) decodedImages.delete(source);
  return Boolean(loaded);
}
// 在桌宠挂载后预解码左右移动与收脚素材，减少首次拖动延迟。
async function preloadMovementImages(): Promise<void> {
  if (!isDefaultPet.value) return;
  // 并行缓存全部移动素材，后续方向切换只需更新图片地址。
  await Promise.all(
    MOVEMENT_PRELOAD_POSES.map((movementPose) =>
      loadImage(PET_POSE_IMAGES[movementPose]),
    ),
  );
}
// 更新同一个图片节点的地址，由 Chromium 自行推进 WebP 帧。
async function updatePose(): Promise<void> {
  // 保存当前请求编号，切换自定义形象也使旧请求失效。
  const request = ++imageRequest;
  if (!isDefaultPet.value) return;
  // 保存本次要展示的姿势，避免 await 后读到另一个状态。
  const nextPose = pose.value;
  // 获取该姿势独立的静态或动态资源。
  const source = PET_POSE_IMAGES[nextPose];
  // 等待图片可展示后再提交最新请求。
  const loaded = await loadImage(source);
  if (request !== imageRequest) return;
  displayedSource.value = loaded ? source : DEFAULT_PET_PREVIEW;
  displayedPose.value = loaded ? nextPose : 'idle';
}
// 相同状态下的尺寸、进度和方向事件不会重启动画。
watch([pose, isDefaultPet], updatePose, { immediate: true });
// 页面就绪后开始预热移动素材，不阻塞首个静态待机画面。
onMounted(preloadMovementImages);
// 卸载时使尚未完成的解码回调失效。
onBeforeUnmount(() => {
  imageRequest += 1;
  decodedImages.clear();
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
