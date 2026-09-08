export type PetActionKey = 'file' | 'directory' | 'settings' | 'close';
export type PetHeaderActionKey = 'records';
export type PetActionTone = 'blue' | 'green' | 'purple' | 'red';
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
