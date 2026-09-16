import { PET_BUBBLE_MAX_SIZE } from '@/constants';
import { PetMotion } from '@/type';
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
