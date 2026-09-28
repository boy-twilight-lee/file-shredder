import { describe, expect, it } from 'vitest';
import { isVisibleInAnyArea } from './bounds';
// 主显示器的可用区域。
const primaryArea = { x: 0, y: 0, width: 1920, height: 1040 };
// 位于主显示器左侧的副显示器可用区域。
const leftArea = { x: -1920, y: 0, width: 1920, height: 1040 };
// 判定窗口可见性时要求的最小重叠尺寸。
const minimumOverlap = 80;
// 验证窗口恢复位置的可见性判断。
describe('isVisibleInAnyArea', () => {
  // 验证完全落在单个显示器内的窗口被接受。
  it('accepts bounds fully inside a single display', () => {
    expect(
      isVisibleInAnyArea(
        { x: 100, y: 100, width: 1180, height: 800 },
        [primaryArea],
        minimumOverlap,
      ),
    ).toBe(true);
  });
  // 验证位于主显示器左侧的副显示器坐标被接受。
  it('accepts bounds on a display with negative coordinates', () => {
    expect(
      isVisibleInAnyArea(
        { x: -1500, y: 200, width: 1180, height: 800 },
        [primaryArea, leftArea],
        minimumOverlap,
      ),
    ).toBe(true);
  });
  // 验证显示器被拔除后遗留的坐标被拒绝。
  it('rejects bounds left on a disconnected display', () => {
    expect(
      isVisibleInAnyArea(
        { x: 2100, y: 100, width: 1180, height: 800 },
        [primaryArea],
        minimumOverlap,
      ),
    ).toBe(false);
  });
  // 验证可见重叠小于阈值时被拒绝。
  it('rejects bounds with overlap smaller than the minimum', () => {
    expect(
      isVisibleInAnyArea(
        { x: 1900, y: 100, width: 1180, height: 800 },
        [primaryArea],
        minimumOverlap,
      ),
    ).toBe(false);
  });
  // 验证可见重叠恰好等于阈值时被接受。
  it('accepts bounds with overlap equal to the minimum', () => {
    expect(
      isVisibleInAnyArea(
        { x: 1840, y: -720, width: 1180, height: 800 },
        [primaryArea],
        minimumOverlap,
      ),
    ).toBe(true);
  });
  // 验证没有任何可用显示器时一律拒绝。
  it('rejects bounds when no area is available', () => {
    expect(
      isVisibleInAnyArea(
        { x: 0, y: 0, width: 1180, height: 800 },
        [],
        minimumOverlap,
      ),
    ).toBe(false);
  });
});
