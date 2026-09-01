import type { PetWindowManager } from '../pet';
import type { AppSettings, AppStore } from '../storage';
import { showShredCompletionNotification } from '../system';
import {
  ShredCancelledError,
  shredPaths,
  type ShredProgress,
} from './shredder';
import {
  createShredLogs,
  getShredTargetMetadata,
  normalizeTargets,
} from './targets';
interface ShredSessionDependencies {
  store: AppStore;
  windowManager: PetWindowManager;
  getSettings: () => AppSettings;
}
export interface ShredSession {
  cancel: () => boolean;
  start: (paths: string[], passes?: 0 | 3 | 7 | 35) => Promise<unknown[]>;
}
// 限制向渲染进程发送粉碎进度的最小间隔。
const PROGRESS_UPDATE_INTERVAL_MS = 80;
// 限制单次任务向调用方返回的详细结果数量。
const MAX_RETAINED_SHRED_RESULTS = 1000;
// 创建管理单次活动粉碎任务的会话控制器。
export function createShredSession(
  dependencies: ShredSessionDependencies,
): ShredSession {
  // 标识当前会话是否已有粉碎任务执行中。
  let isShredding = false;
  // 保存当前任务的取消控制器。
  let activeController: AbortController | null = null;
  // 启动目标规范化、粉碎、记录与结果通知流程。
  async function start(
    paths: string[],
    passes: 0 | 3 | 7 | 35 = dependencies.getSettings().passes,
  ) {
    // 规范化并过滤本次粉碎目标路径。
    const targets = await normalizeTargets(paths);
    if (targets.length === 0 || isShredding) return [];
    // 保存用于任务日志归类的顶层目标信息。
    const targetMetadata = await getShredTargetMetadata(targets);
    isShredding = true;
    // 创建本次任务独立的取消控制器。
    const controller = new AbortController();
    activeController = controller;
    dependencies.windowManager.send('pet:state', 'working');
    // 记录任务开始时间供耗时与进度估算使用。
    const startedAt = Date.now();
    // 保存等待下一次发送的最新进度。
    let pendingProgress: ShredProgress | null = null;
    // 保存上次向渲染进程发送进度的时间。
    let lastProgressSentAt = 0;
    // 保存合并高频进度使用的延迟任务。
    let progressTimer: NodeJS.Timeout | undefined;
    // 立即发送当前待处理进度并重置节流状态。
    function dispatchProgress(): void {
      if (!pendingProgress) return;
      // 固定本次需要发送的进度快照。
      const progress = pendingProgress;
      pendingProgress = null;
      lastProgressSentAt = Date.now();
      if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = undefined;
      }
      dependencies.windowManager.send('pet:progress', progress);
    }
    // 接收底层粉碎进度并按固定间隔合并发送。
    function reportProgress(progress: ShredProgress): void {
      pendingProgress = progress;
      // 计算距上次进度发送经过的时间。
      const elapsed = Date.now() - lastProgressSentAt;
      if (elapsed >= PROGRESS_UPDATE_INTERVAL_MS) {
        dispatchProgress();
        return;
      }
      // 合并高频进度，只保留间隔内的最新状态，防止 IPC 淹没渲染进程。
      if (!progressTimer)
        progressTimer = setTimeout(
          dispatchProgress,
          PROGRESS_UPDATE_INTERVAL_MS - elapsed,
        );
    }
    try {
      // 执行粉碎流程并收集每个目标的结果。
      const results = await shredPaths(
        targets,
        passes,
        reportProgress,
        controller.signal,
      );
      dispatchProgress();
      // 计算正常完成任务的总耗时。
      const durationMs = Date.now() - startedAt;
      // 截取允许向调用方返回的详细结果。
      const retainedResults = results.slice(0, MAX_RETAINED_SHRED_RESULTS);
      await dependencies.store.appendLogs(
        createShredLogs(targetMetadata, results),
      );
      // 汇总未成功处理的结果数量。
      const failedCount = results.reduce(
        (total, result) => total + Number(!result.success),
        0,
      );
      // 汇总成功删除的文件数量。
      const succeeded = results.reduce(
        (total, result) => total + result.deletedFileCount,
        0,
      );
      dependencies.windowManager.send(
        'pet:state',
        failedCount === 0 ? 'success' : 'failure',
      );
      dependencies.windowManager.send('pet:complete', {
        succeeded,
        failed: failedCount,
        durationMs,
        cancelled: false,
      });
      if (dependencies.getSettings().systemNotifications)
        showShredCompletionNotification(succeeded, failedCount, durationMs);
      return retainedResults;
    } catch (error) {
      if (!(error instanceof ShredCancelledError)) throw error;
      dispatchProgress();
      // 计算取消任务前已经执行的总耗时。
      const durationMs = Date.now() - startedAt;
      // 截取取消前允许返回的详细结果。
      const retainedResults = error.results.slice(
        0,
        MAX_RETAINED_SHRED_RESULTS,
      );
      // 汇总取消前已经产生的失败结果数量。
      const failedCount = error.results.reduce(
        (total, result) => total + Number(!result.success),
        0,
      );
      if (retainedResults.length > 0)
        await dependencies.store.appendLogs(
          createShredLogs(targetMetadata, error.results),
        );
      dependencies.windowManager.send('pet:state', 'idle');
      dependencies.windowManager.send('pet:complete', {
        succeeded: error.deletedFileCount,
        failed: failedCount,
        durationMs,
        cancelled: true,
      });
      return retainedResults;
    } finally {
      if (progressTimer) clearTimeout(progressTimer);
      pendingProgress = null;
      if (activeController === controller) activeController = null;
      isShredding = false;
      // 短暂展示最终状态后恢复桌宠空闲状态。
      setTimeout(
        () => dependencies.windowManager.send('pet:state', 'idle'),
        1800,
      );
      dependencies.windowManager.send('logs:updated');
    }
  }
  // 请求取消当前活动粉碎任务。
  function cancel(): boolean {
    if (!activeController || activeController.signal.aborted) return false;
    activeController.abort();
    return true;
  }
  return { cancel, start };
}
