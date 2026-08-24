import { rmSync } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ShredProgress } from './shredder';
import { ShredCancelledError, shredPaths } from './shredder';

describe('shredPaths', () => {
  it('overwrites and removes a regular file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pet-shredder-'));
    const targetPath = join(directory, 'secret.txt');
    await writeFile(targetPath, 'sensitive data', 'utf8');

    const result = await shredPaths([targetPath], 3, () => undefined);

    expect(result).toEqual([{ path: targetPath, success: true }]);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('deletes without overwriting in zero-pass fast mode', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-fast-'));
    const targetPath = join(directory, 'temporary.txt');
    const progress: ShredProgress[] = [];
    await writeFile(targetPath, 'recoverable data', 'utf8');

    const result = await shredPaths([targetPath], 0, (value) => progress.push(value));

    expect(result).toEqual([{ path: targetPath, success: true }]);
    expect(progress.some((value) => value.stage === 'overwriting')).toBe(false);
    expect(progress.some((value) => value.stage === 'removing')).toBe(true);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('stops before changing files when cancellation is already requested', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-cancel-'));
    const targetPath = join(directory, 'keep.txt');
    const controller = new AbortController();
    await writeFile(targetPath, 'keep this data', 'utf8');
    controller.abort();

    try {
      await expect(shredPaths([targetPath], 3, () => undefined, controller.signal)).rejects.toBeInstanceOf(ShredCancelledError);
      await expect(readFile(targetPath, 'utf8')).resolves.toBe('keep this data');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('stops an active overwrite after receiving cancellation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-cancel-active-'));
    const targetPath = join(directory, 'large.bin');
    const controller = new AbortController();
    await writeFile(targetPath, Buffer.alloc(2 * 1024 * 1024, 1));

    try {
      const operation = shredPaths([targetPath], 3, (progress) => {
        if (progress.stage === 'overwriting') controller.abort();
      }, controller.signal);
      await expect(operation).rejects.toBeInstanceOf(ShredCancelledError);
      await expect(lstat(targetPath)).resolves.toMatchObject({ size: 2 * 1024 * 1024 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
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

  it('merges a successful directory and reports only the nested files that failed', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-directory-log-'));
    const successfulDirectory = join(workspace, 'successful');
    const partialDirectory = join(workspace, 'partial');
    await mkdir(successfulDirectory);
    await writeFile(join(successfulDirectory, 'one.txt'), 'one', 'utf8');
    await writeFile(join(successfulDirectory, 'two.txt'), 'two', 'utf8');
    await mkdir(partialDirectory);
    const removedPath = join(partialDirectory, 'a-removed.txt');
    const failedPath = join(partialDirectory, 'b-failed.txt');
    await writeFile(removedPath, 'removed', 'utf8');
    await writeFile(failedPath, 'failed', 'utf8');

    try {
      const successfulResults = await shredPaths([successfulDirectory], 0, () => undefined);
      expect(successfulResults).toEqual([{ path: successfulDirectory, success: true }]);

      const failedResults = await shredPaths([partialDirectory], 0, (progress) => {
        // 在处理首个文件时移除后一文件，稳定模拟递归过程中单个文件失效。
        if (progress.path === removedPath && progress.stage === 'removing') rmSync(failedPath, { force: true });
      });
      expect(failedResults).toHaveLength(1);
      expect(failedResults[0]).toMatchObject({ path: failedPath, success: false });
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
