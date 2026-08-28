// 按总体完成度切换阶段色，让用户无需读取数字也能感知任务进程。
export const PROGRESS_TONE_OPTIONS = [
  { maximum: 30, tone: 'blue' },
  { maximum: 60, tone: 'purple' },
  { maximum: 90, tone: 'orange' },
  { maximum: 100, tone: 'green' },
] as const;
