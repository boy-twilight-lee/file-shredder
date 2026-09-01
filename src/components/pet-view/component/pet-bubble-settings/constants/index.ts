import type { AppSettings } from '@/type';
import { DEFAULT_BUBBLE_APP_TITLE } from '@/constants';
// 提供设置读取完成前及首次启动时的默认值。
export const DEFAULT_APP_SETTINGS: AppSettings = {
  // 设置读取完成前也保持极速删除为默认选中状态。
  passes: 0,
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
  bubbleAppTitle: DEFAULT_BUBBLE_APP_TITLE,
  bubbleAppIconPath: '',
};
// 合并连续桌宠尺寸调整的保存等待时间。
export const PET_SIZE_SAVE_DELAY_MS = 300;
