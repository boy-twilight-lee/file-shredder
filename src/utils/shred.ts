import {
  SHRED_PASSES_LABELS,
  SHRED_QUEUE_COLORS,
  SHRED_STAGE_LABELS,
  SHRED_STAGES,
} from '@/constants';
import {
  ShredPasses,
  ShredProgress,
  ShredQueueSegment,
  ShredResultTone,
  ShredStage,
  ShredSummary,
} from '@/type';
// 读取清理级别对应的一句话文案。
export function resolvePassesLabel(passes: ShredPasses): string {
  return SHRED_PASSES_LABELS[passes];
}
// 读取处理阶段对应的用户视角文案。
export function resolveStageLabel(stage: ShredStage): string {
  return SHRED_STAGE_LABELS[stage];
}
// 生成结果页「数据覆写」的说明文案。
export function resolveOverwriteLabel(passes: ShredPasses): string {
  return passes === 0 ? '跳过覆写，直接删除' : `随机数据覆写 ${passes} 遍`;
}
// 判定结果三态：被取消的任务不视为完全成功，统一归入部分成功语义。
export function resolveResultTone(summary: ShredSummary): ShredResultTone {
  if (summary.cancelled) return 'warning';
  if (summary.failed === 0 && summary.succeeded > 0) return 'success';
  if (summary.succeeded === 0 && summary.failed > 0) return 'error';
  return 'warning';
}
// 判定外部传入的取值是否为受支持的清理级别。
export function isShredPasses(value: unknown): value is ShredPasses {
  return value === 0 || value === 3 || value === 7 || value === 35;
}
// 计算文件级进度百分比，任务未开始时返回 0 避免除零。
export function resolveFilePercent(progress: ShredProgress | null): number {
  if (!progress || progress.fileCount <= 0) return 0;
  // 已完成文件数不超过总文件数，防止上游异常数据导致进度溢出。
  const completed = Math.min(
    Math.max(progress.fileIndex, 0),
    progress.fileCount,
  );
  return Math.round((completed / progress.fileCount) * 100);
}
// 生成环形进度中心展示的文件级进度文案。
export function resolveFileProgressLabel(
  progress: ShredProgress | null,
): string {
  if (!progress || progress.fileCount <= 0) return '等待开始';
  // 已完成文件数不超过总文件数，保证文案与环形一致。
  const completed = Math.min(
    Math.max(progress.fileIndex, 0),
    progress.fileCount,
  );
  return `已完成 ${completed} / ${progress.fileCount} 个文件`;
}
// 计算当前目标的字节级进度百分比。
export function resolveBytePercent(progress: ShredProgress | null): number {
  if (!progress || progress.total <= 0) return 0;
  // 已处理字节数不超过总字节数，防止上游异常数据导致进度溢出。
  const completed = Math.min(Math.max(progress.completed, 0), progress.total);
  return Math.round((completed / progress.total) * 100);
}
// 计算处理阶段在阶段列表中的下标，未知阶段按未开始处理。
export function resolveStageIndex(stage: ShredStage | undefined): number {
  if (!stage) return -1;
  return SHRED_STAGES.indexOf(stage);
}
// 按文件总数与当前处理下标生成队列条的分段状态分布。
export function resolveQueueSegments(
  fileIndex: number,
  fileCount: number,
): ShredQueueSegment[] {
  if (fileCount <= 0) return [];
  // 收敛已完成数量，避免上游异常数据造成分段数量与总数不符。
  const completed = Math.min(Math.max(fileIndex, 0), fileCount);
  if (completed >= fileCount)
    return Array.from({ length: fileCount }, () => ({
      state: 'completed' as const,
      color: SHRED_QUEUE_COLORS.completed,
    }));
  return Array.from({ length: fileCount }, (_item, index) => {
    if (index < completed)
      return {
        state: 'completed' as const,
        color: SHRED_QUEUE_COLORS.completed,
      };
    if (index === completed)
      return { state: 'working' as const, color: SHRED_QUEUE_COLORS.working };
    return { state: 'pending' as const, color: SHRED_QUEUE_COLORS.pending };
  });
}
