import { AppSettings } from '@/type';
export interface AppearanceSettingProps {
  appTitle: string;
  appIconSource: string;
  isChoosingAppIcon: boolean;
  petImageSource: string;
  isChoosingPetImage: boolean;
  petSize: number;
}
export interface AppearanceSettingEmits {
  'update-app-title': [value: string];
  'save-app-title': [];
  'choose-app-icon': [];
  'choose-pet-image': [];
  'update-pet-size': [value: AppSettings['petSize']];
}
