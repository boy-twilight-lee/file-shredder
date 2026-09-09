import type { SystemSettingOption } from '../type';
// 定义系统设置开关及其展示信息。
export const SYSTEM_SETTING_OPTIONS: SystemSettingOption[] = [
  {
    key: 'alwaysOnTop',
    label: '桌宠始终置顶',
    description: '保持桌宠显示在其他窗口上方',
    icon: 'app-pin',
  },
  {
    key: 'launchAtLogin',
    label: '开机自动启动',
    description: '登录 Windows 后自动运行',
    icon: 'app-power',
  },
  {
    key: 'systemNotifications',
    label: '开启系统通知',
    description: '清理完成后发送结果通知',
    icon: 'app-notification',
  },
  {
    key: 'contextMenuInstalled',
    label: '资源管理器右键菜单',
    description: '添加文件和文件夹右键菜单',
    icon: 'app-menu',
  },
];
