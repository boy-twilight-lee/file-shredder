import { constants } from 'node:fs';
import {
  access,
  chmod,
  lstat,
  open,
  readdir,
  rename,
  rm,
  rmdir,
} from 'node:fs/promises';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { randomBytes, randomFill } from 'node:crypto';

export interface ShredProgress {
  path: string;
  completed: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  estimatedSeconds: number;
  stage: 'overwriting' | 'removing' | 'done';
}

export interface ShredResult {
  path: string;
  success: boolean;
  deletedFileCount: number;
  error?: string;
}

export class ShredCancelledError extends Error {
  readonly results: ShredResult[];
  readonly deletedFileCount: number;

  constructor(results: ShredResult[] = [], deletedFileCount = 0) {
    super('文件删除已取消');
    this.name = 'ShredCancelledError';
    this.results = results;
    this.deletedFileCount = deletedFileCount;
  }
}

const CHUNK_SIZE = 1024 * 1024;
const SECURE_FILE_CONCURRENCY = 2;
const FILE_COUNT_CONCURRENCY = 8;

function normalizeTargetPaths(paths: string[]): string[] {
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  const comparablePaths = uniquePaths.map((targetPath) => ({
    path: targetPath,
    comparable:
      process.platform === 'win32'
        ? targetPath.toLocaleLowerCase()
        : targetPath,
  }));
  // 父目录已包含其子项，避免大批量选择时重复删除并误报 ENOENT。
  return comparablePaths
    .filter(
      (candidate) =>
        !comparablePaths.some(
          (possibleParent) =>
            possibleParent.path !== candidate.path &&
            candidate.comparable.startsWith(
              `${possibleParent.comparable}${sep}`,
            ),
        ),
    )
    .map((item) => item.path);
}

function fillRandomBuffer(buffer: Buffer, length: number): Promise<void> {
  return new Promise((resolveFill, rejectFill) => {
    randomFill(buffer, 0, length, (error) => {
      if (error) rejectFill(error);
      else resolveFill();
    });
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function assertSafeTarget(targetPath: string): string {
  const normalized = resolve(targetPath);
  const root = parse(normalized).root;
  if (normalized === root) throw new Error('拒绝粉碎磁盘根目录');
  const protectedDirectories = [
    process.env.SystemRoot,
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.ProgramData,
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => resolve(item).toLocaleLowerCase());
  const comparable = normalized.toLocaleLowerCase();
  if (
    protectedDirectories.some(
      (directory) =>
        comparable === directory || comparable.startsWith(`${directory}${sep}`),
    )
  ) {
    throw new Error('拒绝粉碎 Windows 系统保护目录中的内容');
  }
  return normalized;
}

interface ShredContext {
  passes: 0 | 3 | 7 | 35;
  fileIndex: number;
  fileCount: number;
  deletedFileCount: number;
  countedFilesByPath: ReadonlyMap<string, number>;
  startedAt: number;
  signal?: AbortSignal;
  report: (progress: ShredProgress) => void;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ShredCancelledError();
}

function emitProgress(
  context: ShredContext,
  filePath: string,
  completed: number,
  total: number,
  stage: ShredProgress['stage'],
  fileIndex = context.fileIndex,
): void {
  const elapsedSeconds = Math.max(
    (Date.now() - context.startedAt) / 1000,
    0.001,
  );
  const rate = completed / elapsedSeconds;
  context.report({
    path: filePath,
    completed,
    total,
    fileIndex,
    fileCount: context.fileCount,
    estimatedSeconds:
      rate > 0 ? Math.max(0, Math.round((total - completed) / rate)) : 0,
    stage,
  });
}

async function overwriteFile(
  filePath: string,
  context: ShredContext,
): Promise<void> {
  throwIfCancelled(context.signal);
  const stats = await lstat(filePath);
  context.fileIndex += 1;
  const fileIndex = context.fileIndex;
  if (context.passes === 0) {
    // Fast mode intentionally skips overwriting and filename anonymization so the filesystem can delete immediately.
    throwIfCancelled(context.signal);
    emitProgress(context, filePath, 0, 1, 'removing', fileIndex);
    await rm(filePath, { force: true });
    context.deletedFileCount += 1;
    emitProgress(context, filePath, 1, 1, 'removing', fileIndex);
    return;
  }
  if (stats.isSymbolicLink()) {
    throwIfCancelled(context.signal);
    emitProgress(context, filePath, 0, 1, 'removing', fileIndex);
    await rm(filePath);
    context.deletedFileCount += 1;
    emitProgress(context, filePath, 1, 1, 'removing', fileIndex);
    return;
  }
  if (!stats.isFile()) throw new Error('目标不是普通文件');

  // 只读文件先恢复当前用户写权限；ACL 权限不足仍会明确返回失败。
  await chmod(filePath, 0o600);
  const handle = await open(filePath, 'r+');
  // 每个并发任务复用一个缓冲区，避免大文件覆写时反复分配内存并触发垃圾回收。
  const buffer = Buffer.allocUnsafe(
    Math.min(CHUNK_SIZE, Math.max(1, stats.size)),
  );
  try {
    for (let pass = 0; pass < context.passes; pass += 1) {
      let offset = 0;
      while (offset < stats.size) {
        throwIfCancelled(context.signal);
        const length = Math.min(CHUNK_SIZE, stats.size - offset);
        await fillRandomBuffer(buffer, length);
        await handle.write(buffer, 0, length, offset);
        throwIfCancelled(context.signal);
        offset += length;
        emitProgress(
          context,
          filePath,
          pass * stats.size + offset,
          context.passes * stats.size,
          'overwriting',
          fileIndex,
        );
      }
      throwIfCancelled(context.signal);
      await handle.sync();
      throwIfCancelled(context.signal);
    }
  } finally {
    await handle.close();
  }

  // 在删除前改为随机名称，尽量清除目录项中的原始文件名。
  throwIfCancelled(context.signal);
  const anonymousPath = join(
    dirname(filePath),
    `.${randomBytes(12).toString('hex')}`,
  );
  await rename(filePath, anonymousPath);
  emitProgress(context, filePath, 0, 1, 'removing', fileIndex);
  await rm(anonymousPath, { force: true });
  context.deletedFileCount += 1;
  emitProgress(context, filePath, 1, 1, 'removing', fileIndex);
}

async function shredEntry(
  targetPath: string,
  context: ShredContext,
): Promise<ShredResult[]> {
  throwIfCancelled(context.signal);
  const stats = await lstat(targetPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await overwriteFile(targetPath, context);
    return [];
  }

  if (context.passes === 0) {
    // 极速模式交给系统一次性递归删除，避免为每个目录项执行多轮 JS 异步调用。
    const countedFileCount = context.countedFilesByPath.get(targetPath) ?? 0;
    const progressFileCount = Math.max(1, countedFileCount);
    emitProgress(context, targetPath, 0, 1, 'removing', context.fileIndex + 1);
    await rm(targetPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 50,
    });
    // 递归删除成功代表预扫描到的全部文件均已移除，目录本身不计入文件数。
    context.fileIndex += progressFileCount;
    context.deletedFileCount += countedFileCount;
    emitProgress(context, targetPath, 1, 1, 'removing');
    return [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const failures: ShredResult[] = [];
  const fileEntries: string[] = [];
  const directoryEntries: string[] = [];
  for (const entry of entries) {
    const entryPath = join(targetPath, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink())
      directoryEntries.push(entryPath);
    else fileEntries.push(entryPath);
  }

  // 同一目录内有限并发可提升 SSD 吞吐，同时避免过多并行随机写拖慢机械硬盘。
  const fileResults = await mapWithConcurrency(
    fileEntries,
    SECURE_FILE_CONCURRENCY,
    async (entryPath) => {
      try {
        return await shredEntry(entryPath, context);
      } catch (error) {
        if (error instanceof ShredCancelledError) throw error;
        // 目录粉碎不中断其余项目，并将真正失败的文件路径交给日志展示。
        return [
          {
            path: entryPath,
            success: false,
            deletedFileCount: 0,
            error: error instanceof Error ? error.message : '未知错误',
          },
        ];
      }
    },
  );
  failures.push(...fileResults.flat());
  for (const entryPath of directoryEntries) {
    try {
      failures.push(...(await shredEntry(entryPath, context)));
    } catch (error) {
      if (error instanceof ShredCancelledError) throw error;
      failures.push({
        path: entryPath,
        success: false,
        deletedFileCount: 0,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
  throwIfCancelled(context.signal);
  if (failures.length === 0) {
    await chmod(targetPath, 0o700);
    // 文件已逐个安全覆写并删除，此处使用目录专用 API 移除已经清空的目录。
    await rmdir(targetPath);
  }
  return failures;
}

async function countFiles(
  targetPath: string,
  signal?: AbortSignal,
): Promise<number> {
  try {
    throwIfCancelled(signal);
    const stats = await lstat(targetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return 1;
    const pendingDirectories = [targetPath];
    let fileCount = 0;
    while (pendingDirectories.length > 0) {
      throwIfCancelled(signal);
      const directoryPath = pendingDirectories.pop();
      if (!directoryPath) continue;
      try {
        // Dirent 已包含常规文件类型，迭代扫描可避免为数万个文件同时创建 Promise 和 lstat 请求。
        const entries = await readdir(directoryPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.isSymbolicLink())
            pendingDirectories.push(join(directoryPath, entry.name));
          else fileCount += 1;
        }
      } catch (error) {
        if (error instanceof ShredCancelledError) throw error;
        // 无法读取的目录仍作为一个失败项目计入总数，保持进度与失败结果可见。
        fileCount += 1;
      }
    }
    return fileCount;
  } catch (error) {
    if (error instanceof ShredCancelledError) throw error;
    return 1;
  }
}

export async function shredPaths(
  paths: string[],
  passes: 0 | 3 | 7 | 35,
  report: (progress: ShredProgress) => void,
  signal?: AbortSignal,
): Promise<ShredResult[]> {
  const uniquePaths = normalizeTargetPaths(paths);
  const results: ShredResult[] = [];
  const safePaths = uniquePaths.filter((targetPath) => {
    try {
      assertSafeTarget(targetPath);
      return true;
    } catch {
      return false;
    }
  });
  // 删除前统一统计文件数量，使极速模式与安全覆写模式使用相同的结果口径。
  const countedFiles = await mapWithConcurrency(
    safePaths,
    FILE_COUNT_CONCURRENCY,
    (targetPath) => countFiles(targetPath, signal),
  );
  const countedFilesByPath = new Map(
    safePaths.map((targetPath, index) => [targetPath, countedFiles[index]]),
  );
  const context: ShredContext = {
    passes,
    fileIndex: 0,
    fileCount: Math.max(
      1,
      countedFiles.reduce((sum, count) => sum + Math.max(1, count), 0),
    ),
    deletedFileCount: 0,
    countedFilesByPath,
    startedAt: Date.now(),
    signal,
    report,
  };
  for (const unresolvedPath of uniquePaths) {
    let targetPath = unresolvedPath;
    const startingDeletedFileCount = context.deletedFileCount;
    try {
      throwIfCancelled(signal);
      targetPath = assertSafeTarget(unresolvedPath);
      await access(targetPath, constants.F_OK);
      const startingFileIndex = context.fileIndex;
      const failures = await shredEntry(targetPath, context);
      if (context.fileIndex === startingFileIndex) context.fileIndex += 1;
      emitProgress(context, targetPath, 1, 1, 'done');
      const deletedFileCount =
        context.deletedFileCount - startingDeletedFileCount;
      // 完整成功的目录合并为根目录一条记录；失败时只返回实际失败项目。
      if (failures.length === 0)
        results.push({ path: targetPath, success: true, deletedFileCount });
      else {
        // 部分成功的文件数量附加在首条失败记录上，供完成摘要汇总且不增加日志条目。
        failures[0].deletedFileCount += deletedFileCount;
        results.push(...failures);
      }
    } catch (error) {
      if (error instanceof ShredCancelledError)
        throw new ShredCancelledError(results, context.deletedFileCount);
      results.push({
        path: targetPath,
        success: false,
        deletedFileCount: context.deletedFileCount - startingDeletedFileCount,
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
  return results;
}
