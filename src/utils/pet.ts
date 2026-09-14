import { PetMotion } from '@/type';
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
