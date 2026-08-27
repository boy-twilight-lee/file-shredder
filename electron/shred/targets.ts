import { lstat, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { ShredResult } from './shredder';
import type { ShredLog } from '../storage';

export interface ShredTargetMetadata {
  path: string;
  targetType: 'file' | 'directory';
  size: number | null;
}

const PATH_VALIDATION_CONCURRENCY = 16;

function classifyResult(
  path: string,
  success: boolean,
  error?: string,
): Omit<ShredLog, 'id' | 'timestamp'> {
  if (success)
    return { path, success, category: 'success', message: '粉碎成功' };
  const message = error ?? '未知错误';
  if (/保护目录/.test(message))
    return { path, success, category: 'protected', message };
  if (/EPERM|EACCES|permission/i.test(message))
    return {
      path,
      success,
      category: 'permission',
      message: `权限不足：${message}`,
    };
  if (/EBUSY|occupied|used by another/i.test(message))
    return {
      path,
      success,
      category: 'occupied',
      message: `文件被占用：${message}`,
    };
  return { path, success, category: 'unknown', message };
}

export async function getShredTargetMetadata(
  paths: string[],
): Promise<ShredTargetMetadata[]> {
  return Promise.all(
    paths.map(async (path) => {
      const stats = await lstat(path);
      const isDirectory = stats.isDirectory() && !stats.isSymbolicLink();
      return {
        path,
        targetType: isDirectory ? 'directory' : 'file',
        // 复用类型识别所需的 lstat 结果，不为列表大小增加额外磁盘访问。
        size: isDirectory ? null : stats.size,
      };
    }),
  );
}

function isPathWithinDirectory(
  directoryPath: string,
  targetPath: string,
): boolean {
  const relativePath = relative(directoryPath, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}

export function createShredLogs(
  targets: ShredTargetMetadata[],
  results: ShredResult[],
): Array<Omit<ShredLog, 'id' | 'timestamp'>> {
  const logs: Array<Omit<ShredLog, 'id' | 'timestamp'>> = [];
  for (const target of targets) {
    const targetResults = results.filter((result) =>
      target.targetType === 'directory'
        ? isPathWithinDirectory(target.path, result.path)
        : result.path === target.path,
    );
    if (targetResults.length === 0) continue;
    if (target.targetType === 'file') {
      const result = targetResults[0];
      logs.push({
        ...classifyResult(result.path, result.success, result.error),
        targetType: 'file',
      });
      continue;
    }
    const succeededCount = targetResults.reduce(
      (total, result) => total + result.deletedFileCount,
      0,
    );
    const failedResults = targetResults.filter((result) => !result.success);
    const failedCount = failedResults.length;
    const success = failedCount === 0;
    // 文件夹日志只保留顶层目标和数量汇总，避免泄露或堆积大量子文件路径。
    logs.push({
      ...classifyResult(target.path, success, failedResults[0]?.error),
      targetType: 'directory',
      succeededCount,
      failedCount,
      message: `成功 ${succeededCount} 个，失败 ${failedCount} 个`,
    });
  }
  return logs;
}

export async function normalizeTargets(paths: string[]): Promise<string[]> {
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  const validPaths = new Array<string | undefined>(uniquePaths.length);
  let nextIndex = 0;

  async function validateNextPath(): Promise<void> {
    while (nextIndex < uniquePaths.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        await stat(uniquePaths[currentIndex]);
        validPaths[currentIndex] = uniquePaths[currentIndex];
      } catch {
        validPaths[currentIndex] = undefined;
      }
    }
  }

  // 限制并发文件系统访问，避免一次选中大量目标时阻塞主进程。
  const workerCount = Math.min(PATH_VALIDATION_CONCURRENCY, uniquePaths.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => validateNextPath()),
  );
  return validPaths.filter((path): path is string => Boolean(path));
}
