import { describe, expect, it } from 'vitest';
import { getPetDirection } from './pet';
// 验证屏幕坐标八方向和抖动过滤，防止左右或上下拖动显示反向姿势。
describe('getPetDirection', () => {
  // 顺时针验证右方开始的八个方向。
  it.each([
    [10, 0, 0],
    [10, 10, 1],
    [0, 10, 2],
    [-10, 10, 3],
    [-10, 0, 4],
    [-10, -10, 5],
    [0, -10, 6],
    [10, -10, 7],
  ])('maps (%s, %s) to %s', (x, y, expected) => {
    expect(getPetDirection({ x, y })).toBe(expected);
  });
  // 停止、微小抖动和非法位移不能覆盖清理状态。
  it('ignores stopped, tiny and invalid motion', () => {
    expect(getPetDirection(null)).toBeNull();
    expect(getPetDirection({ x: 1, y: 1 })).toBeNull();
    expect(getPetDirection({ x: NaN, y: 10 })).toBeNull();
    expect(getPetDirection({ x: Infinity, y: 0 })).toBeNull();
  });
});
