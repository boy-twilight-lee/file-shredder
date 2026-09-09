import type { AppSettings, SettingBooleanKey } from '@/type';
export interface SystemSettingProps {
  settings: AppSettings;
  onBeforeChange: (
    key: SettingBooleanKey,
    value: boolean | string | number,
  ) => Promise<boolean>;
}
export interface SystemSettingOption {
  key: SettingBooleanKey;
  label: string;
  description: string;
  icon: string;
}
