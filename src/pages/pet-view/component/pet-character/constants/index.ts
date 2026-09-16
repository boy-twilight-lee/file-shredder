import { PetPose } from '../type';
import { PetBubbleMode } from '@/pages/pet-view/type';
import idleImage from '@/assets/imgs/idle.webp';
import actionsImage from '@/assets/imgs/actions.webp';
import workingImage from '@/assets/imgs/working.webp';
import waitingImage from '@/assets/imgs/waiting.webp';
import successImage from '@/assets/imgs/success.webp';
import failureImage from '@/assets/imgs/failure.webp';
import rightImage from '@/assets/imgs/right.webp';
import leftImage from '@/assets/imgs/left.webp';
import restRightImage from '@/assets/imgs/rest-right.webp';
import restLeftImage from '@/assets/imgs/rest-left.webp';
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
// 操作、设置与记录面板都展示同一张手指指向气泡的动作形象。
export const ACTION_BUBBLE_MODES: ReadonlyArray<PetBubbleMode> = [
  'actions',
  'settings',
  'records',
];
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
