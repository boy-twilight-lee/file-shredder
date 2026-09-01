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
import { mapWithConcurrency } from '@/utils';
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
  // 保存任务取消前已经产生的详细结果。
  readonly results: ShredResult[];
  // 保存任务取消前成功删除的文件数量。
  readonly deletedFileCount: number;
  // 创建携带部分任务结果的取消错误。
  constructor(results: ShredResult[] = [], deletedFileCount = 0) {
    super('文件删除已取消');
    this.name = 'ShredCancelledError';
    this.results = results;
    this.deletedFileCount = deletedFileCount;
  }
}
// 限制单次随机覆写使用的内存块大小。
const CHUNK_SIZE = 1024 * 1024;
// 限制安全覆写模式同时写入的文件数量。
const SECURE_FILE_CONCURRENCY = 2;
// 限制极速模式同时删除的文件数量。
const FAST_FILE_DELETE_CONCURRENCY = 8;
// 限制任务开始前并行统计文件数量的并发数。
const FILE_COUNT_CONCURRENCY = 8;
// 解析、去重并移除已被父目录覆盖的输入路径。
function normalizeTargetPaths(paths: string[]): string[] {
  // 将输入目标统一解析为去重后的绝对路径。
  const uniquePaths = [...new Set(paths.map((item) => resolve(item)))];
  // 生成适配当前平台大小写规则的路径比较值。
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
// 使用加密随机数据填充指定长度的覆写缓冲区。
function fillRandomBuffer(buffer: Buffer, length: number): Promise<void> {
  // 将 Node 回调式随机填充操作包装为 Promise。
  return new Promise((resolveFill, rejectFill) => {
    // 完成随机填充并转发底层错误。
    randomFill(buffer, 0, length, (error) => {
      if (error) rejectFill(error);
      else resolveFill();
    });
  });
}
// 解析目标并拒绝磁盘根目录及系统保护目录。
function assertSafeTarget(targetPath: string): string {
  // 将目标解析为规范绝对路径。
  const normalized = resolve(targetPath);
  // 提取目标所在磁盘或文件系统的根路径。
  const root = parse(normalized).root;
  if (normalized === root) throw new Error('拒绝粉碎磁盘根目录');
  // 汇总当前 Windows 环境中的系统保护目录。
  const protectedDirectories = [
    process.env.SystemRoot,
    process.env.ProgramFiles,
    process.env['ProgramFiles(x86)'],
    process.env.ProgramData,
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => resolve(item).toLocaleLowerCase());
  // 生成目标路径的忽略大小写比较值。
  const comparable = normalized.toLocaleLowerCase();
  // 判断目标是否等于或位于任一系统保护目录内。
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
  startedAt: number;
  signal?: AbortSignal;
  report: (progress: ShredProgress) => void;
}
// 在任务收到取消信号时立即中断当前流程。
function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ShredCancelledError();
}
// 根据当前任务上下文生成并上报粉碎进度。
function emitProgress(
  context: ShredContext,
  filePath: string,
  completed: number,
  total: number,
  stage: ShredProgress['stage'],
  fileIndex = context.fileIndex,
): void {
  // 计算任务已经执行的秒数并避免除零。
  const elapsedSeconds = Math.max(
    (Date.now() - context.startedAt) / 1000,
    0.001,
  );
  // 估算当前任务的平均处理速率。
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
// 按指定覆写次数安全处理并删除单个文件。
async function overwriteFile(
  filePath: string,
  context: ShredContext,
): Promise<void> {
  throwIfCancelled(context.signal);
  // 读取目标自身文件状态，避免跟随符号链接。
  const stats = await lstat(filePath);
  context.fileIndex += 1;
  // 固定当前文件在任务中的展示序号。
  const fileIndex = context.fileIndex;
  if (context.passes === 0) {
    // 快速模式仍逐文件删除，使文件夹任务可以持续反馈进度并准确记录失败项。
    throwIfCancelled(context.signal);
    emitProgress(context, filePath, 0, 1, 'removing', fileIndex);
    await chmod(filePath, 0o600);
    throwIfCancelled(context.signal);
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
  // 以可读写方式打开目标文件供随机覆写。
  const handle = await open(filePath, 'r+');
  // 每个并发任务复用一个缓冲区，避免大文件覆写时反复分配内存并触发垃圾回收。
  // 分配不超过文件大小与块上限的覆写缓冲区。
  const buffer = Buffer.allocUnsafe(
    Math.min(CHUNK_SIZE, Math.max(1, stats.size)),
  );
  try {
    // 依次执行配置要求的全部覆写轮次。
    for (let pass = 0; pass < context.passes; pass += 1) {
      // 保存当前覆写轮次在文件内的写入偏移。
      let offset = 0;
      while (offset < stats.size) {
        throwIfCancelled(context.signal);
        // 计算本次需要覆写的实际字节长度。
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
  // 生成与原文件同目录的随机匿名路径。
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
// 递归处理单个文件或目录并收集失败结果。
async function shredEntry(
  targetPath: string,
  context: ShredContext,
): Promise<ShredResult[]> {
  throwIfCancelled(context.signal);
  // 读取当前目标自身文件状态。
  const stats = await lstat(targetPath);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await overwriteFile(targetPath, context);
    return [];
  }
  // 读取当前目录的直接子项。
  const entries = await readdir(targetPath, { withFileTypes: true });
  // 收集当前目录树中的失败结果。
  const failures: ShredResult[] = [];
  // 收集可并发处理的文件与符号链接路径。
  const fileEntries: string[] = [];
  // 收集需要递归顺序处理的真实子目录路径。
  const directoryEntries: string[] = [];
  // 按类型拆分当前目录的直接子项。
  for (const entry of entries) {
    // 生成当前子项的完整路径。
    const entryPath = join(targetPath, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink())
      directoryEntries.push(entryPath);
    else fileEntries.push(entryPath);
  }
  // 快速删除可提高并发；安全覆写限制并发，避免同时随机写入拖慢机械硬盘。
  // 并发处理当前目录中的全部文件子项。
  const fileResults = await mapWithConcurrency(
    fileEntries,
    context.passes === 0
      ? FAST_FILE_DELETE_CONCURRENCY
      : SECURE_FILE_CONCURRENCY,
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
  // 顺序递归处理子目录以便在内容清空后移除目录。
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
// 迭代统计目标路径包含的文件数量。
async function countFiles(
  targetPath: string,
  signal?: AbortSignal,
): Promise<number> {
  try {
    throwIfCancelled(signal);
    // 读取顶层目标自身文件状态。
    const stats = await lstat(targetPath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return 1;
    // 保存等待扫描的目录栈。
    const pendingDirectories = [targetPath];
    // 累计当前目标包含的文件数量。
    let fileCount = 0;
    while (pendingDirectories.length > 0) {
      throwIfCancelled(signal);
      // 取出下一项等待扫描的目录。
      const directoryPath = pendingDirectories.pop();
      if (!directoryPath) continue;
      try {
        // Dirent 已包含常规文件类型，迭代扫描可避免为数万个文件同时创建 Promise 和 lstat 请求。
        // 读取当前待扫描目录的直接子项。
        const entries = await readdir(directoryPath, { withFileTypes: true });
        // 累计文件并将子目录加入待扫描栈。
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
// 安全粉碎一组目标并返回逐目标执行结果。
export async function shredPaths(
  paths: string[],
  passes: 0 | 3 | 7 | 35,
  report: (progress: ShredProgress) => void,
  signal?: AbortSignal,
): Promise<ShredResult[]> {
  // 规范化并消除输入中的父子路径重复项。
  const uniquePaths = normalizeTargetPaths(paths);
  // 收集本次任务产生的成功与失败结果。
  const results: ShredResult[] = [];
  // 提前筛选可安全处理的非保护路径供文件计数使用。
  const safePaths = uniquePaths.filter((targetPath) => {
    try {
      assertSafeTarget(targetPath);
      return true;
    } catch {
      return false;
    }
  });
  // 删除前统一统计文件数量，使极速模式与安全覆写模式使用相同的结果口径。
  // 并行统计安全目标包含的文件数量。
  const countedFiles = await mapWithConcurrency(
    safePaths,
    FILE_COUNT_CONCURRENCY,
    (targetPath) => countFiles(targetPath, signal),
  );
  // 创建贯穿本次任务的进度与统计上下文。
  const context: ShredContext = {
    passes,
    fileIndex: 0,
    fileCount: Math.max(
      1,
      countedFiles.reduce((sum, count) => sum + Math.max(1, count), 0),
    ),
    deletedFileCount: 0,
    startedAt: Date.now(),
    signal,
    report,
  };
  // 按用户输入顺序处理全部规范化目标。
  for (const unresolvedPath of uniquePaths) {
    // 保存当前目标经过安全校验后的路径。
    let targetPath = unresolvedPath;
    // 记录处理当前目标前已经删除的文件数量。
    const startingDeletedFileCount = context.deletedFileCount;
    try {
      throwIfCancelled(signal);
      targetPath = assertSafeTarget(unresolvedPath);
      await access(targetPath, constants.F_OK);
      // 记录处理当前目标前的进度文件序号。
      const startingFileIndex = context.fileIndex;
      // 收集当前目标递归处理产生的失败结果。
      const failures = await shredEntry(targetPath, context);
      if (context.fileIndex === startingFileIndex) context.fileIndex += 1;
      emitProgress(context, targetPath, 1, 1, 'done');
      // 计算当前顶层目标实际删除的文件数量。
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
