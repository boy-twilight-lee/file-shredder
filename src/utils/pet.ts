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
// 在当前朝向边缘保留额外角度余量，避免斜向拖动在相邻扇区间抖动。
export function getStablePetDirection(
  motion: PetMotion | null,
  current: number | null,
): number | null {
  // 先过滤无效位移，首次移动仍立即反馈。
  const next = getPetDirection(motion);
  if (next === null || current === null || !motion) return next;
  // 将夹角折回半圆，跨越左右角度边界时也保持连续。
  const angle = Math.atan2(motion.y, motion.x) - (current * Math.PI) / 4;
  // 原扇区半宽为 22.5 度，扩大到 34 度形成方向滞回。
  const difference = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
  return difference <= (34 * Math.PI) / 180 ? current : next;
}
