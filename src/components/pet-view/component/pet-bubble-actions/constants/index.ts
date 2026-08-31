export const PET_HEADER_ACTION_OPTIONS = [
  {
    key: 'records',
    title: '粉碎记录',
    icon: 'app-history',
  },
  {
    key: 'settings',
    title: '设置',
    icon: 'app-settings',
  },
] as const;

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
    key: 'lock',
    title: '锁定屏幕',
    description: '立即锁定当前系统会话',
    badge: '快捷安全',
    tone: 'purple',
    icon: 'app-lock',
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
