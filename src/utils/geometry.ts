export interface Point {
  x: number;
  y: number;
}
export interface Rectangle extends Point {
  width: number;
  height: number;
}
// 判断坐标点是否位于指定矩形边界内。
export function containsPoint(bounds: Rectangle, point: Point): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}
// 向四周扩展矩形边界并返回新的矩形。
export function expandRectangle(bounds: Rectangle, padding: number): Rectangle {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}
