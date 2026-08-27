import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
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

    expect(result).toEqual([
      { path: targetPath, success: true, deletedFileCount: 1 },
    ]);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('deletes without overwriting in zero-pass fast mode', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-fast-'));
    const targetPath = join(directory, 'temporary.txt');
    const progress: ShredProgress[] = [];
    await writeFile(targetPath, 'recoverable data', 'utf8');

    const result = await shredPaths([targetPath], 0, (value) =>
      progress.push(value),
    );

    expect(result).toEqual([
      { path: targetPath, success: true, deletedFileCount: 1 },
    ]);
    expect(progress.some((value) => value.stage === 'overwriting')).toBe(false);
    expect(progress.some((value) => value.stage === 'removing')).toBe(true);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('deletes a directory with progressive per-file updates', async () => {
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-fast-directory-'),
    );
    const targetDirectory = join(workspace, 'temporary');
    const progress: ShredProgress[] = [];
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await writeFile(join(targetDirectory, 'one.txt'), 'one', 'utf8');
    await writeFile(join(targetDirectory, 'nested', 'two.txt'), 'two', 'utf8');

    try {
      const result = await shredPaths([targetDirectory], 0, (value) =>
        progress.push(value),
      );

      expect(result).toEqual([
        { path: targetDirectory, success: true, deletedFileCount: 2 },
      ]);
      expect(progress.some((value) => value.stage === 'overwriting')).toBe(
        false,
      );
      expect(progress.every((value) => value.fileCount === 2)).toBe(true);
      expect(progress[0]).toMatchObject({
        completed: 0,
        fileIndex: 1,
        stage: 'removing',
      });
      expect(
        progress.some(
          (value) =>
            value.stage === 'removing' &&
            value.completed === 1 &&
            value.fileIndex === 1,
        ),
      ).toBe(true);
      expect(
        progress.some(
          (value) =>
            value.stage === 'removing' &&
            value.completed === 1 &&
            value.fileIndex === 2,
        ),
      ).toBe(true);
      expect(progress[progress.length - 1]).toMatchObject({
        completed: 1,
        fileIndex: 2,
        stage: 'done',
      });
      await expect(lstat(targetDirectory)).rejects.toThrow();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('stops before changing files when cancellation is already requested', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-cancel-'));
    const targetPath = join(directory, 'keep.txt');
    const controller = new AbortController();
    await writeFile(targetPath, 'keep this data', 'utf8');
    controller.abort();

    try {
      await expect(
        shredPaths([targetPath], 3, () => undefined, controller.signal),
      ).rejects.toBeInstanceOf(ShredCancelledError);
      await expect(readFile(targetPath, 'utf8')).resolves.toBe(
        'keep this data',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('stops an active overwrite after receiving cancellation', async () => {
    const directory = await mkdtemp(
      join(tmpdir(), 'file-shredder-cancel-active-'),
    );
    const targetPath = join(directory, 'large.bin');
    const controller = new AbortController();
    await writeFile(targetPath, Buffer.alloc(2 * 1024 * 1024, 1));

    try {
      const operation = shredPaths(
        [targetPath],
        3,
        (progress) => {
          if (progress.stage === 'overwriting') controller.abort();
        },
        controller.signal,
      );
      await expect(operation).rejects.toBeInstanceOf(ShredCancelledError);
      await expect(lstat(targetPath)).resolves.toMatchObject({
        size: 2 * 1024 * 1024,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('removes nested and empty directories after shredding their files', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-directory-'));
    const targetDirectory = join(workspace, 'private-folder');
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await mkdir(join(targetDirectory, 'empty'), { recursive: true });
    await writeFile(
      join(targetDirectory, 'nested', 'secret.txt'),
      'sensitive data',
      'utf8',
    );
    await writeFile(
      join(targetDirectory, 'nested', 'private.txt'),
      'more sensitive data',
      'utf8',
    );

    try {
      const progress: ShredProgress[] = [];
      const result = await shredPaths([targetDirectory], 3, (value) =>
        progress.push(value),
      );

      expect(result).toEqual([
        { path: targetDirectory, success: true, deletedFileCount: 2 },
      ]);
      expect(progress.every((value) => value.fileCount === 2)).toBe(true);
      expect(progress[progress.length - 1]).toMatchObject({
        fileIndex: 2,
        fileCount: 2,
        stage: 'done',
      });
      await expect(lstat(targetDirectory)).rejects.toThrow();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('merges a successfully removed directory into one result', async () => {
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-directory-log-'),
    );
    const successfulDirectory = join(workspace, 'successful');
    await mkdir(successfulDirectory);
    await writeFile(join(successfulDirectory, 'one.txt'), 'one', 'utf8');
    await writeFile(join(successfulDirectory, 'two.txt'), 'two', 'utf8');

    try {
      const successfulResults = await shredPaths(
        [successfulDirectory],
        0,
        () => undefined,
      );
      expect(successfulResults).toEqual([
        {
          path: successfulDirectory,
          success: true,
          deletedFileCount: 2,
        },
      ]);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('ignores selected descendants when their parent directory is selected', async () => {
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-overlapping-targets-'),
    );
    const targetDirectory = join(workspace, 'parent');
    const nestedFile = join(targetDirectory, 'nested', 'child.txt');
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await writeFile(nestedFile, 'child', 'utf8');

    try {
      const result = await shredPaths(
        [nestedFile, targetDirectory, nestedFile],
        0,
        () => undefined,
      );

      expect(result).toEqual([
        {
          path: targetDirectory,
          success: true,
          deletedFileCount: 1,
        },
      ]);
      await expect(lstat(targetDirectory)).rejects.toThrow();
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('deletes a large batch with monotonic bounded progress', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-batch-'));
    const targetPaths = Array.from({ length: 300 }, (_, index) =>
      join(workspace, `batch-${index}.txt`),
    );
    const progress: ShredProgress[] = [];
    await Promise.all(
      targetPaths.map((targetPath) => writeFile(targetPath, 'batch', 'utf8')),
    );

    try {
      const result = await shredPaths(targetPaths, 0, (value) =>
        progress.push(value),
      );

      expect(result).toHaveLength(targetPaths.length);
      expect(result.every((item) => item.success)).toBe(true);
      expect(
        progress.every((item) => item.fileCount === targetPaths.length),
      ).toBe(true);
      expect(progress.every((item) => item.fileIndex <= item.fileCount)).toBe(
        true,
      );
      expect(progress[progress.length - 1]).toMatchObject({
        fileIndex: targetPaths.length,
        fileCount: targetPaths.length,
        stage: 'done',
      });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('refuses a filesystem root', async () => {
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    const result = await shredPaths([rootPath], 3, () => undefined);
    expect(result[0]).toMatchObject({
      success: false,
      deletedFileCount: 0,
      error: '拒绝粉碎磁盘根目录',
    });
  });
});
