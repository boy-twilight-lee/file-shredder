export const PET_ACTION_OPTIONS = [
  { key: 'file', title: '选择文件', description: '支持同时选择多个文件' },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '包含文件夹内的所有内容',
  },
  {
    key: 'settings',
    title: '设置',
    description: '调整桌宠、清理强度和系统选项',
  },
  {
    key: 'close',
    title: '关闭桌宠',
    description: '退出文件粉碎精灵',
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
