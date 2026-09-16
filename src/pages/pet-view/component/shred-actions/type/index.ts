export type PetActionKey = 'file' | 'directory' | 'settings' | 'close';
export type PetHeaderActionKey = 'records';
export type PetActionTone = 'primary' | 'success' | 'preference' | 'danger';
export interface PetActionOption {
  key: PetActionKey;
  title: string;
  description: string;
  badge: string;
  tone: PetActionTone;
  icon: string;
}
export interface PetHeaderActionOption {
  key: PetHeaderActionKey;
  title: string;
  icon: string;
}

// 定义主操作菜单支持的外部缩放系数。
export interface ShredActionsProps {
  scale?: number;
}
