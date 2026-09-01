import { describe, expect, it } from 'vitest';
import {
  clamp,
  containsPoint,
  expandRectangle,
  formatByteSize,
  formatDuration,
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
