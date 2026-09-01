export interface BubbleHeaderSettingProps {
  appTitle: string;
  appIconSource: string;
  hasCustomAppIcon: boolean;
  isChoosingAppIcon: boolean;
}
export interface BubbleHeaderSettingEmits {
  'update-app-title': [value: string];
  'save-app-title': [];
  'choose-app-icon': [];
  'reset-app-icon': [];
}
