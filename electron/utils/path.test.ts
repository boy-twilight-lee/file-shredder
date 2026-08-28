import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { isPathWithinDirectory } from './path';

describe('isPathWithinDirectory', () => {
  it('accepts the directory itself and nested paths', () => {
    const directory = resolve('workspace');
    expect(isPathWithinDirectory(directory, directory)).toBe(true);
    expect(
      isPathWithinDirectory(directory, resolve(directory, 'nested', 'file')),
    ).toBe(true);
  });

  it('rejects sibling paths with a shared prefix', () => {
    const directory = resolve('workspace');
    expect(isPathWithinDirectory(directory, resolve('workspace-copy'))).toBe(
      false,
    );
  });
});
