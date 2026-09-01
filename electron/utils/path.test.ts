import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { isPathWithinDirectory } from './path';
// 验证跨平台目录包含关系判断。
describe('isPathWithinDirectory', () => {
  // 验证目录自身与内部子路径均被接受。
  it('accepts the directory itself and nested paths', () => {
    // 解析测试使用的目标目录绝对路径。
    const directory = resolve('workspace');
    expect(isPathWithinDirectory(directory, directory)).toBe(true);
    expect(
      isPathWithinDirectory(directory, resolve(directory, 'nested', 'file')),
    ).toBe(true);
  });
  // 验证具有相同前缀的兄弟目录不会被误判。
  it('rejects sibling paths with a shared prefix', () => {
    // 解析测试使用的目标目录绝对路径。
    const directory = resolve('workspace');
    expect(isPathWithinDirectory(directory, resolve('workspace-copy'))).toBe(
      false,
    );
  });
});
