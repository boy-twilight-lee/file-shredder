import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatRemaining,
} from './format';
// 验证毫秒时长格式化为 mm:ss。
describe('formatDuration', () => {
  it('输出补零的分钟与秒数', () => {
    expect(formatDuration(52000)).toBe('00:52');
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(3661000)).toBe('61:01');
  });
  it('非法时长按 0 处理', () => {
    expect(formatDuration(-5)).toBe('00:00');
    expect(formatDuration(Number.NaN)).toBe('00:00');
  });
});
// 验证预计剩余时间的可读文案。
describe('formatRemaining', () => {
  it('按分钟与秒数描述剩余时间', () => {
    expect(formatRemaining(95)).toBe('约 1 分 35 秒');
    expect(formatRemaining(120)).toBe('约 2 分');
    expect(formatRemaining(45)).toBe('约 45 秒');
  });
  it('剩余时间为零时提示即将完成', () => {
    expect(formatRemaining(0)).toBe('即将完成');
    expect(formatRemaining(-10)).toBe('即将完成');
  });
});
// 验证时间格式化与非法输入降级。
describe('formatDateTime', () => {
  it('输出 YYYY-MM-DD HH:mm 格式', () => {
    expect(formatDateTime('2026-09-28T14:31:00.000Z')).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
  });
  it('非法时间字符串返回占位文案', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});
