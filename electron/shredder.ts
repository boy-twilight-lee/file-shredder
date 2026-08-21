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
  report: (progress: ShredProgress) => void;
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
  const stats = await lstat(filePath);
  context.fileIndex += 1;
  if (context.passes === 0) {
    // Fast mode intentionally skips overwriting and filename anonymization so the filesystem can delete immediately.
    emitProgress(context, filePath, 1, 1, 'removing');
    await rm(filePath, { force: true });
    return;
  }
  if (stats.isSymbolicLink()) {
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
        const length = Math.min(CHUNK_SIZE, stats.size - offset);
        const buffer = randomBytes(length);
        await handle.write(buffer, 0, length, offset);
        offset += length;
        emitProgress(context, filePath, pass * stats.size + offset, context.passes * stats.size, 'overwriting');
      }
      await handle.sync();
    }
  } finally {
    await handle.close();
  }

  // 在删除前改为随机名称，尽量清除目录项中的原始文件名。
  const anonymousPath = join(dirname(filePath), `.${randomBytes(12).toString('hex')}`);
  await rename(filePath, anonymousPath);
  emitProgress(context, filePath, 1, 1, 'removing');
  await rm(anonymousPath, { force: true });
}

async function shredEntry(targetPath: string, context: ShredContext): Promise<void> {
  const stats = await lstat(targetPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await overwriteFile(targetPath, context);
    return;
  }

  const entries = await readdir(targetPath);
  for (const entry of entries) await shredEntry(join(targetPath, entry), context);
  await chmod(targetPath, 0o700);
  // 文件已逐个安全覆写并删除，此处使用目录专用 API 移除已经清空的目录。
  await rmdir(targetPath);
}

async function countFiles(targetPath: string): Promise<number> {
  try {
    const stats = await lstat(targetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return 1;
    const entries = await readdir(targetPath);
    if (entries.length === 0) return 0;
    const counts = await Promise.all(entries.map((entry) => countFiles(join(targetPath, entry))));
    return counts.reduce((sum, count) => sum + count, 0);
  } catch {
    return 1;
  }
}

export async function shredPaths(paths: string[], passes: 0 | 3 | 7 | 35, report: (progress: ShredProgress) => void): Promise<Array<{ path: string; success: boolean; error?: string }>> {
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  const results = [];
  const safePaths = uniquePaths.filter((targetPath) => {
    try { assertSafeTarget(targetPath); return true; } catch { return false; }
  });
  // Empty root folders remain one visible unit, while nested empty folders do not inflate file-based progress.
  const fileCounts = await Promise.all(safePaths.map(async (targetPath) => Math.max(1, await countFiles(targetPath))));
  const context: ShredContext = {
    passes,
    fileIndex: 0,
    fileCount: Math.max(1, fileCounts.reduce((sum, count) => sum + count, 0)),
    startedAt: Date.now(),
    report,
  };
  for (const unresolvedPath of uniquePaths) {
    let targetPath = unresolvedPath;
    try {
      targetPath = assertSafeTarget(unresolvedPath);
      await access(targetPath, constants.F_OK);
      const startingFileIndex = context.fileIndex;
      await shredEntry(targetPath, context);
      if (context.fileIndex === startingFileIndex) context.fileIndex += 1;
      emitProgress(context, targetPath, 1, 1, 'done');
      results.push({ path: targetPath, success: true });
    } catch (error) {
      results.push({ path: targetPath, success: false, error: error instanceof Error ? error.message : '未知错误' });
    }
  }
  return results;
}
