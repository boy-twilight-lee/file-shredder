import { PetPose } from '../type';
import idleImage from '@/assets/pet-templates/motions/idle.webp';
import actionsImage from '@/assets/pet-templates/motions/actions.webp';
import workingImage from '@/assets/pet-templates/motions/working.webp';
import waitingImage from '@/assets/pet-templates/motions/waiting.webp';
import reviewImage from '@/assets/pet-templates/motions/review.webp';
import successImage from '@/assets/pet-templates/motions/success.webp';
import failureImage from '@/assets/pet-templates/motions/failure.webp';
import rightImage from '@/assets/pet-templates/motions/right.webp';
import leftImage from '@/assets/pet-templates/motions/left.webp';
import restRightImage from '@/assets/pet-templates/motions/rest-right.webp';
import restLeftImage from '@/assets/pet-templates/motions/rest-left.webp';
import previewImage from '@/assets/pet-templates/default-pet-preview.png';
// 首次解码和素材加载失败时使用稳定的微笑姿势。
export const DEFAULT_PET_PREVIEW = previewImage;
// 待机、步行、清理和结果表情使用动态 WebP，其余状态保持固定姿势。
export const PET_POSE_IMAGES: Record<PetPose, string> = {
  idle: idleImage,
  actions: actionsImage,
  working: workingImage,
  waiting: waitingImage,
  review: reviewImage,
  success: successImage,
  failure: failureImage,
  right: rightImage,
  left: leftImage,
  restRight: restRightImage,
  restLeft: restLeftImage,
};
// 停止移动后短暂收脚，避免继续原地走动或立即跳回正面。
export const PET_MOTION_TIMING = {
  release: 120,
  silence: 320,
  rest: 180,
};
