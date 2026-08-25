export const PET_ACTION_OPTIONS = [
  { key: 'file', title: '选择文件', description: '支持一次选择多个文件' },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '粉碎文件夹内的全部内容',
  },
] as const;

// 左键移动超过该距离后视为拖拽，避免释放鼠标时误打开操作菜单。
export const PET_CLICK_DRAG_THRESHOLD = 5;

// 按总体完成度逐步加深颜色，让用户无需读取数字也能感知任务阶段。
export const PROGRESS_TONE_OPTIONS = [
  { maximum: 24, tone: 'cyan' },
  { maximum: 49, tone: 'blue' },
  { maximum: 74, tone: 'purple' },
  { maximum: 99, tone: 'orange' },
  { maximum: 100, tone: 'green' },
] as const;
