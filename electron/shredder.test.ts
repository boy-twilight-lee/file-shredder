import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ShredProgress } from './shredder';
import { shredPaths } from './shredder';

describe('shredPaths', () => {
  it('overwrites and removes a regular file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pet-shredder-'));
    const targetPath = join(directory, 'secret.txt');
    await writeFile(targetPath, 'sensitive data', 'utf8');

    const result = await shredPaths([targetPath], 3, () => undefined);

    expect(result).toEqual([{ path: targetPath, success: true }]);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('removes nested and empty directories after shredding their files', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-directory-'));
    const targetDirectory = join(workspace, 'private-folder');
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await mkdir(join(targetDirectory, 'empty'), { recursive: true });
    await writeFile(join(targetDirectory, 'nested', 'secret.txt'), 'sensitive data', 'utf8');
    await writeFile(join(targetDirectory, 'nested', 'private.txt'), 'more sensitive data', 'utf8');

    try {
      const progress: ShredProgress[] = [];
      const result = await shredPaths([targetDirectory], 3, (value) => progress.push(value));

      expect(result).toEqual([{ path: targetDirectory, success: true }]);
      expect(progress.every((value) => value.fileCount === 2)).toBe(true);
      expect(progress[progress.length - 1]).toMatchObject({ fileIndex: 2, fileCount: 2, stage: 'done' });
      await expect(lstat(targetDirectory)).rejects.toThrow();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('refuses a filesystem root', async () => {
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    const result = await shredPaths([rootPath], 3, () => undefined);
    expect(result[0]).toMatchObject({ success: false, error: '拒绝粉碎磁盘根目录' });
  });
});
