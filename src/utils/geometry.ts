export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
}

export function containsPoint(bounds: Rectangle, point: Point): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function expandRectangle(bounds: Rectangle, padding: number): Rectangle {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function getDraggedPosition(cursor: Point, pointerOffset: Point): Point {
  return {
    x: Math.round(cursor.x - pointerOffset.x),
    y: Math.round(cursor.y - pointerOffset.y),
  };
}
