import { AppSettings, SettingBooleanKey } from '@/type';
// 定义设置项单选按钮的展示结构。
export interface SettingOption<T extends string> {
  label: string;
  value: T;
  icon: string;
}
// 定义文件清理强度可选项的展示结构。
export interface ShredLevelOption {
  value: AppSettings['passes'];
  label: string;
  icon: string;
}
// 定义清理文件夹根目录时可选的处理方式。
export type CleanupBehavior = 'delete' | 'keep';
// 定义文件夹清理行为可选项的展示结构。
export interface CleanupBehaviorOption {
  value: CleanupBehavior;
  label: string;
  icon: string;
}
// 定义系统设置开关的展示结构。
export interface SystemSettingOption {
  key: SettingBooleanKey;
  label: string;
  description: string;
}
// 定义设置页与全部子组件共享的状态与保存操作。
export interface ShredSettingsContext {
  settings: Ref<AppSettings>;
  isLoading: Ref<boolean>;
  petImageSource: ComputedRef<string>;
  isCustomPetImage: ComputedRef<boolean>;
  isChoosingPetImage: Ref<boolean>;
  isRestoringPetImage: Ref<boolean>;
  choosePetImage: () => Promise<void>;
  restoreDefaultPetImage: () => Promise<void>;
  updatePetSize: (value: AppSettings['petSize']) => Promise<void>;
  updateBubbleDirection: (
    value: AppSettings['bubbleDirection'],
  ) => Promise<void>;
  updateBubbleAlign: (value: AppSettings['bubbleAlign']) => Promise<void>;
  updatePasses: (value: AppSettings['passes']) => Promise<void>;
  updateBooleanSetting: (
    key: SettingBooleanKey,
    value: boolean | string | number,
  ) => Promise<boolean>;
}
