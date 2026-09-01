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
// 验证文件与目录粉碎流程的安全、进度和取消行为。
describe('shredPaths', () => {
  // 验证普通文件经过覆写后被删除。
  it('overwrites and removes a regular file', async () => {
    // 创建普通文件测试使用的临时目录。
    const directory = await mkdtemp(join(tmpdir(), 'pet-shredder-'));
    // 生成待安全粉碎的文件路径。
    const targetPath = join(directory, 'secret.txt');
    await writeFile(targetPath, 'sensitive data', 'utf8');
    // 执行三轮覆写并忽略本场景进度通知。
    const result = await shredPaths([targetPath], 3, () => undefined);
    expect(result).toEqual([
      { path: targetPath, success: true, deletedFileCount: 1 },
    ]);
    await expect(readFile(targetPath)).rejects.toThrow();
  });
  // 验证极速模式不覆写即可删除文件并上报移除进度。
  it('deletes without overwriting in zero-pass fast mode', async () => {
    // 创建极速删除测试使用的临时目录。
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-fast-'));
    // 生成待极速删除的文件路径。
    const targetPath = join(directory, 'temporary.txt');
    // 收集极速模式上报的全部进度。
    const progress: ShredProgress[] = [];
    await writeFile(targetPath, 'recoverable data', 'utf8');
    // 执行零轮覆写并记录实时进度。
    const result = await shredPaths([targetPath], 0, (value) =>
      progress.push(value),
    );
    expect(result).toEqual([
      { path: targetPath, success: true, deletedFileCount: 1 },
    ]);
    // 验证极速模式不会进入覆写阶段。
    expect(progress.some((value) => value.stage === 'overwriting')).toBe(false);
    // 验证极速模式仍会报告文件移除阶段。
    expect(progress.some((value) => value.stage === 'removing')).toBe(true);
    await expect(readFile(targetPath)).rejects.toThrow();
  });
  // 验证目录极速删除会持续上报逐文件进度。
  it('deletes a directory with progressive per-file updates', async () => {
    // 创建目录极速删除测试工作区。
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-fast-directory-'),
    );
    // 生成包含嵌套文件的待删除目录路径。
    const targetDirectory = join(workspace, 'temporary');
    // 收集目录任务上报的全部进度。
    const progress: ShredProgress[] = [];
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await writeFile(join(targetDirectory, 'one.txt'), 'one', 'utf8');
    await writeFile(join(targetDirectory, 'nested', 'two.txt'), 'two', 'utf8');
    try {
      // 执行目录极速删除并记录实时进度。
      const result = await shredPaths([targetDirectory], 0, (value) =>
        progress.push(value),
      );
      expect(result).toEqual([
        { path: targetDirectory, success: true, deletedFileCount: 2 },
      ]);
      // 验证目录极速模式不会进入覆写阶段。
      expect(progress.some((value) => value.stage === 'overwriting')).toBe(
        false,
      );
      // 验证全部进度使用一致的文件总数。
      expect(progress.every((value) => value.fileCount === 2)).toBe(true);
      expect(progress[0]).toMatchObject({
        completed: 0,
        fileIndex: 1,
        stage: 'removing',
      });
      // 验证第一个文件完成移除时上报对应序号。
      expect(
        progress.some(
          (value) =>
            value.stage === 'removing' &&
            value.completed === 1 &&
            value.fileIndex === 1,
        ),
      ).toBe(true);
      // 验证第二个文件完成移除时上报对应序号。
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
  // 验证预先取消的任务不会改动目标文件。
  it('stops before changing files when cancellation is already requested', async () => {
    // 创建预取消测试使用的临时目录。
    const directory = await mkdtemp(join(tmpdir(), 'file-shredder-cancel-'));
    // 生成取消后必须保留的文件路径。
    const targetPath = join(directory, 'keep.txt');
    // 创建并预先触发本次任务的取消控制器。
    const controller = new AbortController();
    await writeFile(targetPath, 'keep this data', 'utf8');
    controller.abort();
    try {
      // 忽略进度并断言预取消任务抛出取消错误。
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
  // 验证活动覆写收到取消后及时停止。
  it('stops an active overwrite after receiving cancellation', async () => {
    // 创建活动取消测试使用的临时目录。
    const directory = await mkdtemp(
      join(tmpdir(), 'file-shredder-cancel-active-'),
    );
    // 生成足以进入分块覆写的测试文件路径。
    const targetPath = join(directory, 'large.bin');
    // 创建活动任务使用的取消控制器。
    const controller = new AbortController();
    await writeFile(targetPath, Buffer.alloc(2 * 1024 * 1024, 1));
    try {
      // 在首次覆写进度到达时取消活动任务。
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
  // 验证安全粉碎后递归移除嵌套与空目录。
  it('removes nested and empty directories after shredding their files', async () => {
    // 创建递归目录粉碎测试工作区。
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-directory-'));
    // 生成包含嵌套与空目录的顶层目标路径。
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
      // 收集安全目录粉碎的全部进度。
      const progress: ShredProgress[] = [];
      // 执行三轮覆写的目录粉碎任务。
      const result = await shredPaths([targetDirectory], 3, (value) =>
        progress.push(value),
      );
      expect(result).toEqual([
        { path: targetDirectory, success: true, deletedFileCount: 2 },
      ]);
      // 验证全部进度使用准确的文件总数。
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
  // 验证成功删除的目录合并为一条顶层结果。
  it('merges a successfully removed directory into one result', async () => {
    // 创建目录结果合并测试工作区。
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-directory-log-'),
    );
    // 生成需要合并结果的成功目录路径。
    const successfulDirectory = join(workspace, 'successful');
    await mkdir(successfulDirectory);
    await writeFile(join(successfulDirectory, 'one.txt'), 'one', 'utf8');
    await writeFile(join(successfulDirectory, 'two.txt'), 'two', 'utf8');
    try {
      // 执行目录极速删除并忽略本场景进度通知。
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
  // 验证父目录已选中时忽略重复选择的后代文件。
  it('ignores selected descendants when their parent directory is selected', async () => {
    // 创建重叠目标测试工作区。
    const workspace = await mkdtemp(
      join(tmpdir(), 'file-shredder-overlapping-targets-'),
    );
    // 生成同时被选择的顶层目录路径。
    const targetDirectory = join(workspace, 'parent');
    // 生成与父目录重复选择的嵌套文件路径。
    const nestedFile = join(targetDirectory, 'nested', 'child.txt');
    await mkdir(join(targetDirectory, 'nested'), { recursive: true });
    await writeFile(nestedFile, 'child', 'utf8');
    try {
      // 执行包含重复路径与父子目标的极速删除。
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
  // 验证大批量删除的进度单调且保持在有效范围。
  it('deletes a large batch with monotonic bounded progress', async () => {
    // 创建大批量删除测试工作区。
    const workspace = await mkdtemp(join(tmpdir(), 'file-shredder-batch-'));
    // 生成三百个批量测试文件路径。
    const targetPaths = Array.from({ length: 300 }, (_, index) =>
      join(workspace, `batch-${index}.txt`),
    );
    // 收集批量任务上报的全部进度。
    const progress: ShredProgress[] = [];
    // 并行创建本次批量删除需要的目标文件。
    await Promise.all(
      targetPaths.map((targetPath) => writeFile(targetPath, 'batch', 'utf8')),
    );
    try {
      // 执行大批量极速删除并记录实时进度。
      const result = await shredPaths(targetPaths, 0, (value) =>
        progress.push(value),
      );
      expect(result).toHaveLength(targetPaths.length);
      // 验证全部批量目标均处理成功。
      expect(result.every((item) => item.success)).toBe(true);
      // 验证全部进度使用一致的目标文件总数。
      expect(
        progress.every((item) => item.fileCount === targetPaths.length),
      ).toBe(true);
      // 验证展示序号始终不超过文件总数。
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
  // 验证文件系统根目录始终被安全保护。
  it('refuses a filesystem root', async () => {
    // 选择当前平台对应的文件系统根目录。
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    // 尝试粉碎根目录并收集拒绝结果。
    const result = await shredPaths([rootPath], 3, () => undefined);
    expect(result[0]).toMatchObject({
      success: false,
      deletedFileCount: 0,
      error: '拒绝粉碎磁盘根目录',
    });
  });
});
