import { describe, expect, it } from 'vitest';
import {
  clamp,
  containsPoint,
  expandRectangle,
  formatByteSize,
  formatDuration,
  getDraggedPosition,
  getPathName,
  mapWithConcurrency,
} from './index';

describe('shared utils', () => {
  it('maps values with bounded concurrency while preserving order', async () => {
    let activeWorkers = 0;
    let maximumActiveWorkers = 0;
    const results = await mapWithConcurrency([3, 1, 2, 4], 2, async (value) => {
      activeWorkers += 1;
      maximumActiveWorkers = Math.max(maximumActiveWorkers, activeWorkers);
      await new Promise((resolve) => setTimeout(resolve, value));
      activeWorkers -= 1;
      return value * 2;
    });

    expect(results).toEqual([6, 2, 4, 8]);
    expect(maximumActiveWorkers).toBe(2);
  });

  it('rejects invalid concurrency values', async () => {
    await expect(mapWithConcurrency([], 0, async () => true)).rejects.toThrow(
      RangeError,
    );
  });

  it('formats sizes and durations consistently', () => {
    expect(formatByteSize(512)).toBe('512 B');
    expect(formatByteSize(1536)).toBe('1.5 KB');
    expect(formatDuration(850)).toBe('850 ms');
    expect(formatDuration(61500)).toBe('1 min 2 s');
  });

  it('supports common numeric and rectangle operations', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    const expanded = expandRectangle(
      { x: 10, y: 20, width: 30, height: 40 },
      5,
    );
    expect(expanded).toEqual({ x: 5, y: 15, width: 40, height: 50 });
    expect(containsPoint(expanded, { x: 45, y: 65 })).toBe(true);
    expect(containsPoint(expanded, { x: 46, y: 65 })).toBe(false);
  });

  it('keeps the pointer offset stable while dragging across displays', () => {
    const pointerOffset = { x: 1120, y: 580 };

    expect(getDraggedPosition({ x: 1920, y: 900 }, pointerOffset)).toEqual({
      x: 800,
      y: 320,
    });
    expect(getDraggedPosition({ x: -640, y: 240 }, pointerOffset)).toEqual({
      x: -1760,
      y: -340,
    });
  });
});
