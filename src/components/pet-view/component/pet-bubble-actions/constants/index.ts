// 定义气泡标题栏中的辅助操作入口。
export const PET_HEADER_ACTION_OPTIONS = [
  {
    key: 'records',
    title: '粉碎记录',
    icon: 'app-history',
  },
] as const;
// 定义桌宠主操作菜单及其展示语义。
export const PET_ACTION_OPTIONS = [
  {
    key: 'file',
    title: '选择文件',
    description: '支持同时选择多个文件',
    badge: '常用',
    tone: 'blue',
    icon: 'app-file-add',
  },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '包含文件夹内的所有内容',
    badge: '递归清理',
    tone: 'green',
    icon: 'app-folder-open',
  },
  {
    key: 'settings',
    title: '设置',
    description: '调整桌宠与应用行为',
    badge: '偏好设置',
    tone: 'purple',
    icon: 'app-settings',
  },
  {
    key: 'close',
    title: '关闭桌宠',
    description: '退出文件粉碎精灵',
    badge: '谨慎操作',
    tone: 'red',
    icon: 'app-power',
  },
] as const;
