import { describe, expect, it } from 'vitest';
import {
  clamp,
  containsPoint,
  expandRectangle,
  formatByteSize,
  formatDuration,
  formatRecordTime,
  getPathDirectory,
  getPathName,
  mapWithConcurrency,
} from './index';
// 验证共享工具函数的核心边界行为。
describe('shared utils', () => {
  // 验证并发映射限制活动任务数量且保持输入顺序。
  it('maps values with bounded concurrency while preserving order', async () => {
    // 记录当前正在执行的工作器数量。
    let activeWorkers = 0;
    // 记录测试期间出现的最大并发数量。
    let maximumActiveWorkers = 0;
    // 并发映射不同延迟值并收集输出。
    const results = await mapWithConcurrency([3, 1, 2, 4], 2, async (value) => {
      activeWorkers += 1;
      maximumActiveWorkers = Math.max(maximumActiveWorkers, activeWorkers);
      // 按输入值模拟不同耗时的异步工作器。
      await new Promise((resolve) => setTimeout(resolve, value));
      activeWorkers -= 1;
      return value * 2;
    });
    expect(results).toEqual([6, 2, 4, 8]);
    expect(maximumActiveWorkers).toBe(2);
  });
  // 验证无效并发数会被明确拒绝。
  it('rejects invalid concurrency values', async () => {
    // 使用无副作用工作器触发参数校验分支。
    await expect(mapWithConcurrency([], 0, async () => true)).rejects.toThrow(
      RangeError,
    );
  });
  // 验证容量与耗时格式化结果保持统一。
  it('formats sizes and durations consistently', () => {
    expect(formatByteSize(512)).toBe('512 B');
    expect(formatByteSize(1536)).toBe('1.5 KB');
    expect(formatDuration(850)).toBe('850 ms');
    expect(formatDuration(61500)).toBe('1 min 2 s');
  });
  // 验证跨平台路径能够稳定拆分末级名称与来源目录。
  it('extracts names and directories from cross-platform paths', () => {
    expect(getPathName('C:\\Users\\demo\\report.txt')).toBe('report.txt');
    expect(getPathDirectory('C:\\Users\\demo\\report.txt')).toBe(
      'C:\\Users\\demo',
    );
    expect(getPathDirectory('C:\\report.txt')).toBe('C:\\');
    expect(getPathDirectory('/var/tmp/report.txt')).toBe('/var/tmp');
    expect(getPathDirectory('report.txt')).toBe('');
  });
  // 验证记录时间按照今天、昨天、本年和跨年边界生成展示文本。
  it('formats record times by calendar distance', () => {
    // 固定参照时间，覆盖跨日和跨年时不会受测试运行时间影响。
    const referenceTime = '2026-09-01T14:30:00';
    expect(formatRecordTime('2026-09-01T08:05:00', referenceTime)).toBe(
      '今天 08:05',
    );
    expect(formatRecordTime('2026-08-31T23:45:00', referenceTime)).toBe(
      '昨天 23:45',
    );
    expect(formatRecordTime('2026-03-08T12:00:00', referenceTime)).toBe(
      '03月08日',
    );
    expect(formatRecordTime('2025-12-31T12:00:00', referenceTime)).toBe(
      '2025年12月',
    );
  });
  // 验证数值限制与矩形计算的常见场景。
  it('supports common numeric and rectangle operations', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    // 扩展测试矩形供边界命中断言使用。
    const expanded = expandRectangle(
      { x: 10, y: 20, width: 30, height: 40 },
      5,
    );
    expect(expanded).toEqual({ x: 5, y: 15, width: 40, height: 50 });
    expect(containsPoint(expanded, { x: 45, y: 65 })).toBe(true);
    expect(containsPoint(expanded, { x: 46, y: 65 })).toBe(false);
  });
});
