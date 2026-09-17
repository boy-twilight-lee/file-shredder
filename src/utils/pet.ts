import {
  PET_BUBBLE_DEFAULT_WIDTH,
  PET_BUBBLE_MAX_SIZE,
  PET_SETTINGS_BUBBLE_HEIGHT,
  PET_WINDOW_PADDING,
} from '@/constants';
import { PetMotion } from '@/type';
// 计算紧凑气泡布局在最大透明画布区域内居中后的横纵留白。
export function calculatePetBubbleLayoutInsets(
  petHeight: number,
  scale: number = 1,
) {
  // 将窗口基础留白换算为当前渲染比例。
  const padding = PET_WINDOW_PADDING * scale;
  // 计算普通气泡相对最大 records 区域的水平居中留白。
  const horizontal =
    padding +
    ((PET_BUBBLE_MAX_SIZE.width - PET_BUBBLE_DEFAULT_WIDTH) * scale) / 2;
  // 计算当前画布纵向实际预留的最大内容高度。
  const availableHeight = Math.max(
    PET_BUBBLE_MAX_SIZE.height * scale,
    petHeight,
  );
  // 计算设置页与人物共同占用的紧凑布局高度。
  const settingsLayoutHeight = Math.max(
    PET_SETTINGS_BUBBLE_HEIGHT * scale,
    petHeight,
  );
  return {
    horizontal,
    vertical: padding + (availableHeight - settingsLayoutHeight) / 2,
  };
}
// 计算人物上方需要预留的对齐空间：气泡贴到人物底部时会向上越出人物顶部。
export function calculatePetAlignHeadroom(
  petHeight: number,
  bubbleHeight: number = PET_BUBBLE_MAX_SIZE.height,
): number {
  return Math.max(0, bubbleHeight - petHeight);
}
// 只使用水平位移决定朝向，纵向拖动延续已有朝向，忽略微小抖动。
export function getHorizontalPetDirection(
  motion: PetMotion | null,
  current: 'left' | 'right' | null,
): 'left' | 'right' | null {
  if (!motion || !Number.isFinite(motion.x) || !Number.isFinite(motion.y))
    return null;
  if (Math.hypot(motion.x, motion.y) < 2) return null;
  if (Math.abs(motion.x) < 2) return current;
  return motion.x < 0 ? 'left' : 'right';
}
