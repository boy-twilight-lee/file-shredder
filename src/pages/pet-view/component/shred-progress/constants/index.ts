// 按总体完成度切换任务阶段，让用户无需读取数字也能感知任务进程。
export const PROGRESS_STAGE_OPTIONS = [
  { maximum: 30, stage: 'start' },
  { maximum: 60, stage: 'active' },
  { maximum: 90, stage: 'final' },
  { maximum: 100, stage: 'completed' },
] as const;
