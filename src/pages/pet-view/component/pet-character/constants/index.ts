import { PetPose } from '../type';
import idleImage from '@/assets/imgs/motions/idle.webp';
import actionsImage from '@/assets/imgs/motions/actions.webp';
import workingImage from '@/assets/imgs/motions/working.webp';
import waitingImage from '@/assets/imgs/motions/waiting.webp';
import successImage from '@/assets/imgs/motions/success.webp';
import failureImage from '@/assets/imgs/motions/failure.webp';
import rightImage from '@/assets/imgs/motions/right.webp';
import leftImage from '@/assets/imgs/motions/left.webp';
import restRightImage from '@/assets/imgs/motions/rest-right.webp';
import restLeftImage from '@/assets/imgs/motions/rest-left.webp';
import previewImage from '@/assets/imgs/default-pet-preview.png';
// 首次解码和素材加载失败时使用稳定的微笑姿势。
export const DEFAULT_PET_PREVIEW = previewImage;
// 待机、工作、步行与结果表情使用动态 WebP，操作和等待保持固定姿势。
export const PET_POSE_IMAGES: Record<PetPose, string> = {
  idle: idleImage,
  actions: actionsImage,
  working: workingImage,
  waiting: waitingImage,
  success: successImage,
  failure: failureImage,
  right: rightImage,
  left: leftImage,
  restRight: restRightImage,
  restLeft: restLeftImage,
};
// 提前解码移动相关素材，降低首次左右拖动时的切换等待。
export const MOVEMENT_PRELOAD_POSES: ReadonlyArray<PetPose> = [
  'left',
  'right',
  'restLeft',
  'restRight',
];
// 停止移动后短暂收脚，避免继续原地走动或立即跳回正面。
export const PET_MOTION_TIMING = {
  release: 80,
  silence: 220,
  rest: 120,
};
