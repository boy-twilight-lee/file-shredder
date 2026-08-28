import type { Component } from 'vue';
import type { AppSettings, PetImageTemplate, SettingBooleanKey } from '@/type';

export interface GeneralSettingsPanelProps {
  settings: AppSettings;
  petImageTemplates: PetImageTemplate[];
  isChoosingPetImage: boolean;
  onBeforeChange: (
    key: SettingBooleanKey,
    value: boolean | string | number,
  ) => Promise<boolean>;
}

export interface GeneralSettingsPanelEmits {
  'choose-pet-image': [];
  'select-pet-image': [id: string];
  'delete-pet-image': [id: string];
  'update-pet-size': [value: number | undefined];
  'update-passes': [value: AppSettings['passes']];
}

export interface SettingsSwitchOption {
  key: SettingBooleanKey;
  label: string;
  description: string;
  icon: Component;
}

export type ShredLevelIconMap = Record<AppSettings['passes'], Component>;
