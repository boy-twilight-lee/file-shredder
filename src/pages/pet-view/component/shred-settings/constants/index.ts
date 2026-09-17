import {
  CleanupBehaviorOption,
  SettingOption,
  ShredLevelOption,
  SystemSettingOption,
} from '../type';
import { AppSettings, BubbleAlign, BubbleDirection } from '@/type';
import { DEFAULT_BUBBLE_ALIGN, DEFAULT_BUBBLE_DIRECTION } from '@/constants';
// 提供设置读取完成前及首次启动时的默认值。
export const DEFAULT_APP_SETTINGS: AppSettings = {
  // 设置读取完成前也保持极速删除为默认选中状态。
  passes: 0,
  // 默认在清理文件夹时一并删除用户选中的根目录。
  removeRootDirectory: true,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  systemNotifications: true,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petImageTemplateId: 'built-in-ao-yin',
  uploadedPetImages: [],
  petSize: 200,
  petDisplayId: null,
  petPositionX: null,
  petPositionY: null,
  // 首次渲染沿用操作气泡位于人物左侧并垂直居中的展示方式。
  bubbleDirection: DEFAULT_BUBBLE_DIRECTION,
  bubbleAlign: DEFAULT_BUBBLE_ALIGN,
};
// 合并连续桌宠尺寸调整的保存等待时间。
export const PET_SIZE_SAVE_DELAY_MS = 300;
// 限制桌宠可设置的最小显示尺寸。
export const PET_SIZE_MIN = 50;
// 限制桌宠可设置的最大显示尺寸。
export const PET_SIZE_MAX = 400;
// 定义桌宠尺寸控件的单次调整步长。
export const PET_SIZE_STEP = 4;
// 定义操作气泡相对桌宠的方位可选项。
export const BUBBLE_DIRECTION_OPTIONS: SettingOption<BubbleDirection>[] = [
  { label: '居左', value: 'left', icon: 'icon-align-left' },
  { label: '居右', value: 'right', icon: 'icon-align-right' },
];
// 定义操作气泡相对桌宠的对齐方式可选项。
export const BUBBLE_ALIGN_OPTIONS: SettingOption<BubbleAlign>[] = [
  { label: '顶部', value: 'top', icon: 'icon-align-top' },
  { label: '居中', value: 'center', icon: 'icon-align-center' },
  { label: '底部', value: 'bottom', icon: 'icon-align-bottom' },
];
// 定义文件清理强度可选项及其业务图标。
export const SHRED_LEVEL_OPTIONS: ShredLevelOption[] = [
  {
    value: 0,
    label: '极速',
    icon: 'icon-delete',
  },
  {
    value: 3,
    label: '日常',
    icon: 'icon-lightning',
  },
  {
    value: 7,
    label: '加强',
    icon: 'icon-shield',
  },
  {
    value: 35,
    label: '深度',
    icon: 'icon-storage',
  },
];
// 定义清理文件夹根目录处理方式可选项及其业务图标，删除对应删除根目录，保留对应仅清理文件夹内容。
export const CLEANUP_BEHAVIOR_OPTIONS: CleanupBehaviorOption[] = [
  {
    value: 'delete',
    label: '删除根目录',
    icon: 'icon-delete',
  },
  {
    value: 'keep',
    label: '保留根目录',
    icon: 'icon-folder-open',
  },
];
// 按功能拆分清理强度说明，依次说明强度作用、各强度覆写次数与清理代价，供强度选项后的说明图标逐行展示。
export const SHRED_LEVEL_TIP_LINES: string[] = [
  '清理强度决定每个文件被随机数据覆写的次数：',
  '极速删除：不覆写数据',
  '日常清理：覆写 3 次',
  '加强清理：覆写 7 次',
  '深度清理：覆写 35 次',
  '覆写次数越多越难恢复，清理耗时也越长。',
];
// 定义系统设置开关及其展示文案。
export const SYSTEM_SETTING_OPTIONS: SystemSettingOption[] = [
  {
    key: 'alwaysOnTop',
    label: '桌宠始终置顶',
    description: '保持桌宠显示在其他窗口上方',
  },
  {
    key: 'launchAtLogin',
    label: '开机自动启动',
    description: '登录 Windows 后自动运行',
  },
  {
    key: 'systemNotifications',
    label: '开启系统通知',
    description: '清理完成后发送结果通知',
  },
  {
    key: 'contextMenuInstalled',
    label: '资源管理器右键菜单',
    description: '添加文件和文件夹右键菜单',
  },
];
