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

const PROGRESS_UPDATE_INTERVAL_MS = 80;
const MAX_RETAINED_SHRED_RESULTS = 1000;

export function createShredSession(
  dependencies: ShredSessionDependencies,
): ShredSession {
  let isShredding = false;
  let activeController: AbortController | null = null;

  async function start(
    paths: string[],
    passes: 0 | 3 | 7 | 35 = dependencies.getSettings().passes,
  ) {
    const targets = await normalizeTargets(paths);
    if (targets.length === 0 || isShredding) return [];
    const targetMetadata = await getShredTargetMetadata(targets);
    isShredding = true;
    const controller = new AbortController();
    activeController = controller;
    dependencies.windowManager.send('pet:state', 'working');
    const startedAt = Date.now();
    let pendingProgress: ShredProgress | null = null;
    let lastProgressSentAt = 0;
    let progressTimer: NodeJS.Timeout | undefined;

    function dispatchProgress(): void {
      if (!pendingProgress) return;
      const progress = pendingProgress;
      pendingProgress = null;
      lastProgressSentAt = Date.now();
      if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = undefined;
      }
      dependencies.windowManager.send('pet:progress', progress);
    }

    function reportProgress(progress: ShredProgress): void {
      pendingProgress = progress;
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
      const results = await shredPaths(
        targets,
        passes,
        reportProgress,
        controller.signal,
      );
      dispatchProgress();
      const durationMs = Date.now() - startedAt;
      const retainedResults = results.slice(0, MAX_RETAINED_SHRED_RESULTS);
      await dependencies.store.appendLogs(
        createShredLogs(targetMetadata, results),
      );
      const failedCount = results.reduce(
        (total, result) => total + Number(!result.success),
        0,
      );
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
      const durationMs = Date.now() - startedAt;
      const retainedResults = error.results.slice(
        0,
        MAX_RETAINED_SHRED_RESULTS,
      );
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
      setTimeout(
        () => dependencies.windowManager.send('pet:state', 'idle'),
        1800,
      );
      dependencies.windowManager.send('logs:updated');
    }
  }

  function cancel(): boolean {
    if (!activeController || activeController.signal.aborted) return false;
    activeController.abort();
    return true;
  }

  return { cancel, start };
}
