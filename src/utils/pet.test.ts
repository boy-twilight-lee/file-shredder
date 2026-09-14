import { describe, expect, it } from 'vitest';
import { getHorizontalPetDirection } from './pet';
// 左右动画不能再被上下位移或斜向角度切换成其他姿势。
describe('getHorizontalPetDirection', () => {
  // 不论垂直速度多大，都按有效的水平位移决定左右方向。
  it.each([
    [10, 0, 'right'],
    [10, 100, 'right'],
    [10, -100, 'right'],
    [-10, 0, 'left'],
    [-10, 100, 'left'],
    [-10, -100, 'left'],
  ])(
    'maps (%s, %s) to %s',
    // 验证横向符号与姿势一致，避免斜向移动显示错误动画。
    (x, y, expected) => {
      expect(
        getHorizontalPetDirection({ x: Number(x), y: Number(y) }, null),
      ).toBe(expected);
    },
  );
  // 垂直拖动和水平噪声延续已选朝向，首次垂直拖动不凭空选择方向。
  it('preserves the heading during vertical motion', () => {
    expect(getHorizontalPetDirection({ x: 0, y: 10 }, null)).toBeNull();
    expect(getHorizontalPetDirection({ x: 1, y: -10 }, 'left')).toBe('left');
    expect(getHorizontalPetDirection({ x: -1, y: 10 }, 'right')).toBe('right');
  });
  // 有效反向移动立即响应，停止和非法事件释放方向。
  it('handles reversals, release and invalid motion', () => {
    expect(getHorizontalPetDirection({ x: -8, y: 0 }, 'right')).toBe('left');
    expect(getHorizontalPetDirection(null, 'left')).toBeNull();
    expect(getHorizontalPetDirection({ x: 1, y: 1 }, 'left')).toBeNull();
    expect(getHorizontalPetDirection({ x: NaN, y: 10 }, 'left')).toBeNull();
    expect(
      getHorizontalPetDirection({ x: Infinity, y: 0 }, 'right'),
    ).toBeNull();
  });
});
