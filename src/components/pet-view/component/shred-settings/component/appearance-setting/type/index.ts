import { AppSettings } from '@/type';
export interface AppearanceSettingProps {
  petImageSource: string;
  isChoosingPetImage: boolean;
  isCustomPetImage: boolean;
  isRestoringPetImage: boolean;
  petSize: number;
  bubbleDirection: AppSettings['bubbleDirection'];
  bubbleAlign: AppSettings['bubbleAlign'];
}
export interface AppearanceSettingEmits {
  'choose-pet-image': [];
  'restore-default-pet-image': [];
  'update-pet-size': [value: AppSettings['petSize']];
  'update-bubble-direction': [value: AppSettings['bubbleDirection']];
  'update-bubble-align': [value: AppSettings['bubbleAlign']];
}
// 定义设置项单选按钮的展示结构。
export interface SettingOption<T extends string> {
  label: string;
  value: T;
  icon: string;
}
