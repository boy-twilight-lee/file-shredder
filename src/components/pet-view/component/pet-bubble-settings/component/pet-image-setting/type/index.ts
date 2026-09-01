import { PetImageTemplate } from '@/type';
export interface PetImageSettingProps {
  petImageTemplates: PetImageTemplate[];
  isChoosingPetImage: boolean;
  petSize: number;
}
export interface PetImageSettingEmits {
  'choose-pet-image': [];
  'select-pet-image': [id: string];
  'delete-pet-image': [id: string];
  'update-pet-size': [value: number];
}
