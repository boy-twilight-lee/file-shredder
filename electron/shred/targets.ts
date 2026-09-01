import { lstat, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ShredResult } from './shredder';
import type { ShredLog } from '../storage';
import { isPathWithinDirectory } from '../utils';
import { mapWithConcurrency } from '@/utils';
export interface ShredTargetMetadata {
  path: string;
  targetType: 'file' | 'directory';
  size: number | null;
}
// 限制批量目标有效性检查的文件系统并发数。
const PATH_VALIDATION_CONCURRENCY = 16;
// 将底层粉碎结果归类为面向用户的日志状态。
function classifyResult(
  path: string,
  success: boolean,
  error?: string,
): Omit<ShredLog, 'id' | 'timestamp'> {
  if (success)
    return { path, success, category: 'success', message: '粉碎成功' };
  // 统一缺失的底层错误信息。
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
// 并行读取顶层粉碎目标的类型与大小信息。
export async function getShredTargetMetadata(
  paths: string[],
): Promise<ShredTargetMetadata[]> {
  // 将每个路径映射为确认页与日志使用的目标元数据。
  return Promise.all(
    paths.map(async (path) => {
      // 读取目标自身状态，避免跟随符号链接。
      const stats = await lstat(path);
      // 标识目标是否为真实目录。
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
// 将逐文件粉碎结果汇总为顶层目标日志。
export function createShredLogs(
  targets: ShredTargetMetadata[],
  results: ShredResult[],
): Array<Omit<ShredLog, 'id' | 'timestamp'>> {
  // 收集本次任务生成的顶层粉碎日志。
  const logs: Array<Omit<ShredLog, 'id' | 'timestamp'>> = [];
  // 按用户选择的顶层目标归并底层结果。
  for (const target of targets) {
    // 筛选属于当前顶层目标的逐文件结果。
    const targetResults = results.filter((result) =>
      target.targetType === 'directory'
        ? isPathWithinDirectory(target.path, result.path)
        : result.path === target.path,
    );
    if (targetResults.length === 0) continue;
    if (target.targetType === 'file') {
      // 文件目标只对应首条底层结果。
      const result = targetResults[0];
      logs.push({
        ...classifyResult(result.path, result.success, result.error),
        targetType: 'file',
      });
      continue;
    }
    // 汇总目录目标成功删除的文件数量。
    const succeededCount = targetResults.reduce(
      (total, result) => total + result.deletedFileCount,
      0,
    );
    // 收集目录目标中的实际失败结果。
    const failedResults = targetResults.filter((result) => !result.success);
    // 统计目录目标失败项目数量。
    const failedCount = failedResults.length;
    // 标识目录目标是否全部处理成功。
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
// 规范化、去重并过滤不存在的候选目标路径。
export async function normalizeTargets(paths: string[]): Promise<string[]> {
  // 将输入路径解析为去重后的绝对路径。
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  // 限制并发文件系统访问，避免一次选中大量目标时阻塞主进程。
  // 保存通过文件系统有效性检查的路径结果。
  const validPaths = await mapWithConcurrency(
    uniquePaths,
    PATH_VALIDATION_CONCURRENCY,
    async (path) => {
      try {
        await stat(path);
        return path;
      } catch {
        return undefined;
      }
    },
  );
  // 移除文件系统检查失败产生的空路径。
  return validPaths.filter((path): path is string => Boolean(path));
}
