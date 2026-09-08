import { AppSettings } from '@/type';
export interface AppearanceSettingProps {
  appTitle: string;
  appIconSource: string;
  isChoosingAppIcon: boolean;
  petImageSource: string;
  isChoosingPetImage: boolean;
  isCustomPetImage: boolean;
  isRestoringPetImage: boolean;
  petSize: number;
}
export interface AppearanceSettingEmits {
  'update-app-title': [value: string];
  'save-app-title': [];
  'choose-app-icon': [];
  'choose-pet-image': [];
  'restore-default-pet-image': [];
  'update-pet-size': [value: AppSettings['petSize']];
}
