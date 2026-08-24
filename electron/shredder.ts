import { constants } from 'node:fs';
import { access, chmod, lstat, open, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { dirname, join, parse, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';

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
  error?: string;
}

export class ShredCancelledError extends Error {
  readonly results: ShredResult[];

  constructor(results: ShredResult[] = []) {
    super('文件删除已取消');
    this.name = 'ShredCancelledError';
    this.results = results;
  }
}

const CHUNK_SIZE = 1024 * 1024;
function assertSafeTarget(targetPath: string): string {
  const normalized = resolve(targetPath);
  const root = parse(normalized).root;
  if (normalized === root) throw new Error('拒绝粉碎磁盘根目录');
  const protectedDirectories = [
    process.env.SystemRoot,
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.ProgramData,
  ].filter((item): item is string => Boolean(item)).map((item) => resolve(item).toLocaleLowerCase());
  const comparable = normalized.toLocaleLowerCase();
  if (protectedDirectories.some((directory) => comparable === directory || comparable.startsWith(`${directory}${sep}`))) {
    throw new Error('拒绝粉碎 Windows 系统保护目录中的内容');
  }
  return normalized;
}

interface ShredContext {
  passes: 0 | 3 | 7 | 35;
  fileIndex: number;
  fileCount: number;
  startedAt: number;
  signal?: AbortSignal;
  report: (progress: ShredProgress) => void;
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ShredCancelledError();
}

function emitProgress(context: ShredContext, filePath: string, completed: number, total: number, stage: ShredProgress['stage']): void {
  const elapsedSeconds = Math.max((Date.now() - context.startedAt) / 1000, 0.001);
  const rate = completed / elapsedSeconds;
  context.report({
    path: filePath,
    completed,
    total,
    fileIndex: context.fileIndex,
    fileCount: context.fileCount,
    estimatedSeconds: rate > 0 ? Math.max(0, Math.round((total - completed) / rate)) : 0,
    stage,
  });
}

async function overwriteFile(filePath: string, context: ShredContext): Promise<void> {
  throwIfCancelled(context.signal);
  const stats = await lstat(filePath);
  context.fileIndex += 1;
  if (context.passes === 0) {
    // Fast mode intentionally skips overwriting and filename anonymization so the filesystem can delete immediately.
    throwIfCancelled(context.signal);
    emitProgress(context, filePath, 1, 1, 'removing');
    await rm(filePath, { force: true });
    return;
  }
  if (stats.isSymbolicLink()) {
    throwIfCancelled(context.signal);
    await rm(filePath);
    return;
  }
  if (!stats.isFile()) throw new Error('目标不是普通文件');

  // 只读文件先恢复当前用户写权限；ACL 权限不足仍会明确返回失败。
  await chmod(filePath, 0o600);
  const handle = await open(filePath, 'r+');
  try {
    for (let pass = 0; pass < context.passes; pass += 1) {
      let offset = 0;
      while (offset < stats.size) {
        throwIfCancelled(context.signal);
        const length = Math.min(CHUNK_SIZE, stats.size - offset);
        const buffer = randomBytes(length);
        await handle.write(buffer, 0, length, offset);
        throwIfCancelled(context.signal);
        offset += length;
        emitProgress(context, filePath, pass * stats.size + offset, context.passes * stats.size, 'overwriting');
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
  const anonymousPath = join(dirname(filePath), `.${randomBytes(12).toString('hex')}`);
  await rename(filePath, anonymousPath);
  emitProgress(context, filePath, 1, 1, 'removing');
  await rm(anonymousPath, { force: true });
}

async function shredEntry(targetPath: string, context: ShredContext): Promise<ShredResult[]> {
  throwIfCancelled(context.signal);
  const stats = await lstat(targetPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await overwriteFile(targetPath, context);
    return [];
  }

  const entries = await readdir(targetPath);
  const failures: ShredResult[] = [];
  for (const entry of entries) {
    const entryPath = join(targetPath, entry);
    try {
      failures.push(...await shredEntry(entryPath, context));
    } catch (error) {
      if (error instanceof ShredCancelledError) throw error;
      // 目录粉碎不中断其余项目，并将真正失败的文件路径交给日志展示。
      failures.push({ path: entryPath, success: false, error: error instanceof Error ? error.message : '未知错误' });
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

async function countFiles(targetPath: string, signal?: AbortSignal): Promise<number> {
  try {
    throwIfCancelled(signal);
    const stats = await lstat(targetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return 1;
    const entries = await readdir(targetPath);
    if (entries.length === 0) return 0;
    const counts = await Promise.all(entries.map((entry) => countFiles(join(targetPath, entry), signal)));
    return counts.reduce((sum, count) => sum + count, 0);
  } catch (error) {
    if (error instanceof ShredCancelledError) throw error;
    return 1;
  }
}

export async function shredPaths(paths: string[], passes: 0 | 3 | 7 | 35, report: (progress: ShredProgress) => void, signal?: AbortSignal): Promise<ShredResult[]> {
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  const results: ShredResult[] = [];
  const safePaths = uniquePaths.filter((targetPath) => {
    try { assertSafeTarget(targetPath); return true; } catch { return false; }
  });
  // Empty root folders remain one visible unit, while nested empty folders do not inflate file-based progress.
  const fileCounts = await Promise.all(safePaths.map(async (targetPath) => Math.max(1, await countFiles(targetPath, signal))));
  const context: ShredContext = {
    passes,
    fileIndex: 0,
    fileCount: Math.max(1, fileCounts.reduce((sum, count) => sum + count, 0)),
    startedAt: Date.now(),
    signal,
    report,
  };
  for (const unresolvedPath of uniquePaths) {
    let targetPath = unresolvedPath;
    try {
      throwIfCancelled(signal);
      targetPath = assertSafeTarget(unresolvedPath);
      await access(targetPath, constants.F_OK);
      const startingFileIndex = context.fileIndex;
      const failures = await shredEntry(targetPath, context);
      if (context.fileIndex === startingFileIndex) context.fileIndex += 1;
      emitProgress(context, targetPath, 1, 1, 'done');
      // 完整成功的目录合并为根目录一条记录；失败时只返回实际失败项目。
      if (failures.length === 0) results.push({ path: targetPath, success: true });
      else results.push(...failures);
    } catch (error) {
      if (error instanceof ShredCancelledError) throw new ShredCancelledError(results);
      results.push({ path: targetPath, success: false, error: error instanceof Error ? error.message : '未知错误' });
    }
  }
  return results;
}
