import { describe, expect, it } from 'vitest';
import { calculatePetBubbleLayoutInsets } from './pet';
// 验证紧凑气泡布局在 records 最大画布中的居中留白。
describe('calculatePetBubbleLayoutInsets', () => {
  // 普通尺寸桌宠应按 340×480 设置气泡计算稳定的横纵留白。
  it('centers the compact settings layout in the maximum bubble area', () => {
    expect(calculatePetBubbleLayoutInsets(200)).toEqual({
      horizontal: 210,
      vertical: 40,
    });
  });
  // 人物高于最大气泡时只保留窗口基础留白，避免额外垂直位移。
  it('keeps base padding when the pet is taller than the bubble area', () => {
    expect(calculatePetBubbleLayoutInsets(600)).toEqual({
      horizontal: 210,
      vertical: 30,
    });
  });
});
