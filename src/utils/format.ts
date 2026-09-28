import dayjs from 'dayjs';
import { isNumber } from 'lodash-es';
// 时间或时长不可用时的占位文案。
const TIME_PLACEHOLDER = '—';
// 将毫秒时长格式化为 mm:ss，非法值按 0 处理避免出现负数。
export function formatDuration(durationMs: number): string {
  // 收敛非法或负数时长，避免界面出现负号。
  const safeDuration = isNumber(durationMs) && durationMs > 0 ? durationMs : 0;
  // 向下取整到秒后换算分与秒。
  const totalSeconds = Math.floor(safeDuration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
// 将预计剩余秒数格式化为用户可读的描述文案。
export function formatRemaining(remainingSeconds: number): string {
  const safeSeconds =
    isNumber(remainingSeconds) && remainingSeconds > 0
      ? Math.ceil(remainingSeconds)
      : 0;
  if (safeSeconds === 0) return '即将完成';
  if (safeSeconds < 60) return `约 ${safeSeconds} 秒`;
  // 换算剩余分钟与不足一分钟的秒数。
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return seconds === 0 ? `约 ${minutes} 分` : `约 ${minutes} 分 ${seconds} 秒`;
}
// 将时间戳格式化为记录与明细统一使用的 YYYY-MM-DD HH:mm。
export function formatDateTime(value: string | number | Date): string {
  // 解析待格式化的时间，非法输入统一降级为占位文案。
  const parsed = dayjs(value);
  return parsed.isValid()
    ? parsed.format('YYYY-MM-DD HH:mm')
    : TIME_PLACEHOLDER;
}
// 将时间戳格式化为日期选择器使用的 YYYY-MM-DD。
export function formatDate(value: string | number | Date): string {
  // 解析待格式化的时间，非法输入统一降级为占位文案。
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : TIME_PLACEHOLDER;
}
