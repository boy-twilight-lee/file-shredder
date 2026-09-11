import { describe, expect, it } from 'vitest';
import { getPetDirection, getStablePetDirection } from './pet';
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
// 复现横向与斜向边界反复跨越，确认视觉方向不会跟随微小噪声闪动。
describe('getStablePetDirection', () => {
  // 在原扇区边缘仍保留当前方向，明显改变角度后才切换。
  it('holds the heading across the diagonal boundary', () => {
    expect(getPetDirection({ x: 10, y: 5 })).toBe(1);
    expect(getStablePetDirection({ x: 10, y: 5 }, 0)).toBe(0);
    expect(getStablePetDirection({ x: 10, y: 8 }, 0)).toBe(1);
    expect(getStablePetDirection({ x: 10, y: 5 }, 1)).toBe(1);
  });
  // 首次反馈和真正反向移动不被滞回延迟。
  it('accepts the first direction and full reversals', () => {
    expect(getStablePetDirection({ x: 8, y: 0 }, null)).toBe(0);
    expect(getStablePetDirection({ x: -8, y: 0 }, 0)).toBe(4);
    expect(getStablePetDirection({ x: -10, y: -1 }, 4)).toBe(4);
    expect(getStablePetDirection(null, 4)).toBeNull();
  });
});
