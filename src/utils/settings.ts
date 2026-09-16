import { DEFAULT_BUBBLE_ALIGN, DEFAULT_BUBBLE_DIRECTION } from '@/constants';
import { BubbleAlign, BubbleDirection } from '@/type';
// 列出操作气泡支持的展示方位。
const BUBBLE_DIRECTIONS: readonly BubbleDirection[] = ['left', 'right'];
// 列出操作气泡支持的纵向对齐方式。
const BUBBLE_ALIGNS: readonly BubbleAlign[] = ['top', 'center', 'bottom'];
// 将任意设置值规范化为操作气泡支持的展示方位。
export function normalizeBubbleDirection(value: unknown): BubbleDirection {
  return BUBBLE_DIRECTIONS.includes(value as BubbleDirection)
    ? (value as BubbleDirection)
    : DEFAULT_BUBBLE_DIRECTION;
}
// 将任意设置值规范化为操作气泡支持的纵向对齐方式。
export function normalizeBubbleAlign(value: unknown): BubbleAlign {
  return BUBBLE_ALIGNS.includes(value as BubbleAlign)
    ? (value as BubbleAlign)
    : DEFAULT_BUBBLE_ALIGN;
}
