import { PetMotion } from '@/type';
// 将屏幕位移量化为顺时针八方向，右方为零；忽略无效和静止位移。
export function getPetDirection(motion: PetMotion | null): number | null {
  if (
    !motion ||
    !Number.isFinite(motion.x) ||
    !Number.isFinite(motion.y) ||
    Math.hypot(motion.x, motion.y) < 2
  )
    return null;
  return (Math.round(Math.atan2(motion.y, motion.x) / (Math.PI / 4)) + 8) % 8;
}
