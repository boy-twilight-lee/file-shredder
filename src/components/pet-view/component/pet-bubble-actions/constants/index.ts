import {
  IconFile,
  IconFolder,
  IconHistory,
  IconPoweroff,
  IconSettings,
} from '@arco-design/web-vue/es/icon';

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

export const PET_ACTION_ICONS = {
  file: IconFile,
  directory: IconFolder,
  settings: IconSettings,
  records: IconHistory,
  close: IconPoweroff,
};
