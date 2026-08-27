export const PET_ACTION_OPTIONS = [
  {
    key: 'file',
    title: '选择文件',
    description: '支持同时选择多个文件',
    badge: '常用',
    tone: 'blue',
  },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '包含文件夹内的所有内容',
    badge: '递归清理',
    tone: 'green',
  },
  {
    key: 'settings',
    title: '设置',
    description: '调整桌宠、清理强度和系统选项',
    badge: '个性化',
    tone: 'purple',
  },
  {
    key: 'records',
    title: '粉碎记录',
    description: '查看文件与文件夹的历史清理结果',
    badge: '历史记录',
    tone: 'orange',
  },
  {
    key: 'close',
    title: '关闭桌宠',
    description: '退出文件粉碎精灵',
    badge: '谨慎操作',
    tone: 'red',
  },
] as const;

// 左键移动超过该距离后视为拖拽，避免释放鼠标时误打开操作菜单。
export const PET_CLICK_DRAG_THRESHOLD = 5;

// 按总体完成度切换阶段色，让用户无需读取数字也能感知任务进程。
export const PROGRESS_TONE_OPTIONS = [
  { maximum: 30, tone: 'blue' },
  { maximum: 60, tone: 'purple' },
  { maximum: 90, tone: 'orange' },
  { maximum: 100, tone: 'green' },
] as const;
