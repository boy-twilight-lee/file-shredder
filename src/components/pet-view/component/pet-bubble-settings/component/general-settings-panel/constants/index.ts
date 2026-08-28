import {
  IconDelete,
  IconMenu,
  IconNotification,
  IconPoweroff,
  IconPushpin,
  IconSafe,
  IconStorage,
  IconThunderbolt,
} from '@arco-design/web-vue/es/icon';
import type { SettingsSwitchOption, ShredLevelIconMap } from '../type';

export const SWITCH_OPTIONS: SettingsSwitchOption[] = [
  {
    key: 'alwaysOnTop',
    label: '桌宠始终置顶',
    description: '保持桌宠显示在其他窗口上方',
    icon: IconPushpin,
  },
  {
    key: 'launchAtLogin',
    label: '开机自动启动',
    description: '登录 Windows 后自动运行',
    icon: IconPoweroff,
  },
  {
    key: 'systemNotifications',
    label: '开启系统通知',
    description: '清理完成后发送结果通知',
    icon: IconNotification,
  },
  {
    key: 'contextMenuInstalled',
    label: '资源管理器右键菜单',
    description: '添加文件和文件夹右键菜单',
    icon: IconMenu,
  },
];

export const SHRED_LEVEL_ICONS: ShredLevelIconMap = {
  0: IconDelete,
  3: IconThunderbolt,
  7: IconSafe,
  35: IconStorage,
};
