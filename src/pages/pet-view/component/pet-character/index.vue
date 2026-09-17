<template>
  <div
    ref="petCharacterElement"
    :class="[
      'pet-character',
      `pet-character-${pose}`,
      { 'pet-character-mirrored': isMirrored },
    ]"
    :style="petStyle"
    @mousedown.right.stop
    @click.left="handleClick"
    @contextmenu.prevent
  >
    <div
      ref="petVisualElement"
      class="pet-character-visual"
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
  </div>
</template>
<script setup lang="ts">
import { gsap } from 'gsap';
import { PetCharacterProps, PetPose } from './type';
import { usePetMotion } from './hooks';
import {
  ACTION_BUBBLE_MODES,
  MOVEMENT_PRELOAD_POSES,
  PET_POSE_IMAGES,
} from './constants';
import { usePetViewContext } from '@/pages/pet-view/hooks';
import { calculatePetBubbleLayoutInsets } from '@/utils';
import { PetCharacterDrag } from './component';
// 定义气泡打开时是否显示原生桌宠拖动入口、人物外观尺寸与外部缩放系数。
const props = withDefaults(defineProps<PetCharacterProps>(), { scale: 1 });
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
// 保存人物根元素，用于测量位置与尺寸切换前后的完整布局变化。
const petCharacterElement = ref<HTMLElement | null>(null);
// 保存人物视觉层，让位移缩放动画与图片镜像变换互不干扰。
const petVisualElement = ref<HTMLElement | null>(null);
// 保存尚未结束的 GSAP 布局补间，连续切换时由新动画接管。
let petLayoutTween: gsap.core.Tween | null = null;
// 递增布局动画请求版本，阻止快速切换时旧测量结果覆盖新动画。
let petLayoutRequest = 0;
// 按缩放系数与气泡布局换算人物的展示尺寸与贴边位置。
const petStyle = computed<Record<string, string>>(() => {
  // 保存按缩放系数换算后的人物宽度与高度。
  const width = Math.round(props.petWidth * props.scale);
  const height = Math.round(props.petHeight * props.scale);
  // 将紧凑气泡布局居中放入 records 使用的最大透明画布区域。
  const layoutInsets = calculatePetBubbleLayoutInsets(height, props.scale);
  // 汇总人物尺寸与横向位置，方向切换只跨越紧凑气泡的真实宽度。
  const style: Record<string, string> = {
    '--pet-wave-size': `${Math.round(height * 0.86)}px`,
    height: `${height}px`,
    width: `${width}px`,
    left: isBubbleOnRight.value
      ? `${Math.round(layoutInsets.horizontal)}px`
      : `calc(100% - ${Math.round(layoutInsets.horizontal + width)}px)`,
  };
  // 顶部与底部对齐按设置气泡真实高度计算，居中时以位移抵消自身高度。
  if (bubbleAlign.value === 'top') {
    style.top = `${Math.round(layoutInsets.vertical)}px`;
  } else if (bubbleAlign.value === 'bottom') {
    style.top = 'auto';
    style.bottom = `${Math.round(layoutInsets.vertical)}px`;
  } else {
    style.top = '50%';
    style.transform = 'translateY(-50%)';
  }
  return style;
});
// 清除 GSAP 写入的视觉层变换与原点，为下一次布局切换恢复干净基准。
function clearPetVisualTransform(visualElement: HTMLElement): void {
  gsap.set(visualElement, { clearProps: 'transform,transformOrigin' });
  if (petVisualElement.value === visualElement) petLayoutTween = null;
}
// 按人物切换前后的可见边界播放位移与缩放，同时保持 Trigger 锚点位于最终布局。
async function playPetLayoutMotion(): Promise<void> {
  // 记录本次请求，等待 DOM 更新后仅允许最新一次切换继续播放。
  const request = ++petLayoutRequest;
  // 固定本次测量使用的根元素与视觉层，避免异步阶段引用发生变化。
  const characterElement = petCharacterElement.value;
  const visualElement = petVisualElement.value;
  if (!characterElement || !visualElement) return;
  // 读取视觉层当前帧的真实显示边界，连续切换时从未完成动画的位置接续。
  const visibleBounds = visualElement.getBoundingClientRect();
  petLayoutTween?.kill();
  await nextTick();
  if (
    request !== petLayoutRequest ||
    petCharacterElement.value !== characterElement ||
    petVisualElement.value !== visualElement
  )
    return;
  // 读取新位置与尺寸生效后的根节点边界。
  const nextBounds = characterElement.getBoundingClientRect();
  // 将当前可见边界反向补偿到新布局，使位置与尺寸都从当前帧连续过渡。
  const offsetX = visibleBounds.left - nextBounds.left;
  const offsetY = visibleBounds.top - nextBounds.top;
  const scaleX =
    nextBounds.width > 0 ? visibleBounds.width / nextBounds.width : 1;
  const scaleY =
    nextBounds.height > 0 ? visibleBounds.height / nextBounds.height : 1;
  // 综合位置距离与尺寸比例判断本次布局是否确实发生可见变化。
  const distance = Math.hypot(offsetX, offsetY);
  const scaleDistance = Math.max(Math.abs(scaleX - 1), Math.abs(scaleY - 1));
  if (distance < 0.5 && scaleDistance < 0.002) {
    clearPetVisualTransform(visualElement);
    return;
  }
  // 按位移距离与缩放幅度调整时长，大幅调整尺寸时保留足够的过渡时间。
  const duration = Math.min(
    0.56,
    Math.max(0.3, 0.3 + distance * 0.00035 + scaleDistance * 0.18),
  );
  petLayoutTween = gsap.fromTo(
    visualElement,
    {
      x: offsetX,
      y: offsetY,
      scaleX,
      scaleY,
      transformOrigin: '0 0',
    },
    {
      duration,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: clearPetVisualTransform,
      onCompleteParams: [visualElement],
    },
  );
}
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
  // 操作、设置与记录面板统一展示手指指向气泡的动作形象。
  if (ACTION_BUBBLE_MODES.includes(bubbleMode.value)) return 'actions';
  if (bubbleMode.value !== 'hidden') return 'idle';
  return petState.value === 'working' ? 'working' : 'idle';
});
// 手指要指向气泡：默认形象的气泡位于人物右侧时镜像翻转动作素材，素材本身朝左。
const isMirrored = computed(
  () => isDefaultPet.value && pose.value === 'actions' && isBubbleOnRight.value,
);
// 解码下一张图片之前保留待机画面，避免快速切换出现空白。
const displayedSource = ref(PET_POSE_IMAGES.idle);
// 姿势标识与已经解码并提交的图片保持一致。
const displayedPose = ref<PetPose>('idle');
// 每个组件缓存解码中的图片，避免同方向事件重复加载。
const decodedImages = new Map<string, Promise<boolean>>();
// 递增请求版本，阻止较慢的旧图片覆盖新的业务状态。
let imageRequest = 0;
// 在浏览器完成首帧解码后才允许切换图片，错误时保留待机动画。
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
  displayedSource.value = loaded ? source : PET_POSE_IMAGES.idle;
  displayedPose.value = loaded ? nextPose : 'idle';
}
// 相同状态下的尺寸、进度和方向事件不会重启动画。
watch([pose, isDefaultPet], updatePose, { immediate: true });
// 气泡布局、人物尺寸或预览比例变化时播放连续的位移缩放动画。
watch(
  [
    bubbleDirection,
    bubbleAlign,
    () => props.petWidth,
    () => props.petHeight,
    () => props.scale,
  ],
  playPetLayoutMotion,
);
// 页面就绪后开始预热移动素材，不阻塞首个静态待机画面。
onMounted(preloadMovementImages);
// 卸载时使尚未完成的解码回调失效。
onBeforeUnmount(() => {
  imageRequest += 1;
  petLayoutRequest += 1;
  petLayoutTween?.kill();
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
