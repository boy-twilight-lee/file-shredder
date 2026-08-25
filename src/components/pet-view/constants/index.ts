export const PET_ACTION_OPTIONS = [
  { key: 'file', title: '选择文件', description: '支持一次选择多个文件' },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '粉碎文件夹内的全部内容',
  },
] as const;

// 按总体完成度逐步加深颜色，让用户无需读取数字也能感知任务阶段。
export const PROGRESS_TONE_OPTIONS = [
  { maximum: 24, tone: 'cyan' },
  { maximum: 49, tone: 'blue' },
  { maximum: 74, tone: 'purple' },
  { maximum: 99, tone: 'orange' },
  { maximum: 100, tone: 'green' },
] as const;
