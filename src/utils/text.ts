import {
  BUBBLE_APP_TITLE_MAX_LENGTH,
  DEFAULT_BUBBLE_APP_TITLE,
} from '@/constants';
// 将任意设置值规范化为操作气泡允许展示的应用标题。
export function normalizeBubbleAppTitle(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_BUBBLE_APP_TITLE;
  // 按 Unicode 字符截取，避免中文标题受 UTF-16 编码细节影响。
  const normalizedTitle = Array.from(value.trim())
    .slice(0, BUBBLE_APP_TITLE_MAX_LENGTH)
    .join('');
  return normalizedTitle || DEFAULT_BUBBLE_APP_TITLE;
}
