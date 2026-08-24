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
  { maximum: 24, tone: 'cyan', color: '#0eaaa6' },
  { maximum: 49, tone: 'blue', color: '#165dff' },
  { maximum: 74, tone: 'purple', color: '#722ed1' },
  { maximum: 99, tone: 'orange', color: '#f77234' },
  { maximum: 100, tone: 'green', color: '#00a854' },
] as const;
