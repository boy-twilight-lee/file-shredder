// 描述屏幕坐标系中的一个矩形区域。
export interface BoundsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
// 判断目标矩形是否与任一可用区域保持足够大小的可见重叠。
export function isVisibleInAnyArea(
  bounds: BoundsRect,
  areas: BoundsRect[],
  minimumOverlap: number,
): boolean {
  return areas.some((area) => {
    // 计算目标矩形与可用区域在水平方向的交集宽度。
    const horizontalOverlap =
      Math.min(bounds.x + bounds.width, area.x + area.width) -
      Math.max(bounds.x, area.x);
    // 计算目标矩形与可用区域在垂直方向的交集高度。
    const verticalOverlap =
      Math.min(bounds.y + bounds.height, area.y + area.height) -
      Math.max(bounds.y, area.y);
    return (
      horizontalOverlap >= minimumOverlap && verticalOverlap >= minimumOverlap
    );
  });
}
