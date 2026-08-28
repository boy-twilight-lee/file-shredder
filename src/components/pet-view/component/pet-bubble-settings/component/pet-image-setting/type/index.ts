import type { PetImageTemplate } from '@/type';

export interface PetImageSettingProps {
  petImageTemplates: PetImageTemplate[];
  isChoosingPetImage: boolean;
}

export interface PetImageSettingEmits {
  'choose-pet-image': [];
  'select-pet-image': [id: string];
  'delete-pet-image': [id: string];
}
