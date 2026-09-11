import { PetAnimation } from '../type';
import idleImage from '@/assets/pet-templates/default-pet-idle.webp';
import facingImage from '@/assets/pet-templates/default-pet-facing.webp';
import workingImage from '@/assets/pet-templates/default-pet-working.webp';
import successImage from '@/assets/pet-templates/default-pet-success.webp';
import failureImage from '@/assets/pet-templates/default-pet-failure.webp';
import waitingImage from '@/assets/pet-templates/default-pet-waiting.webp';
import reviewImage from '@/assets/pet-templates/default-pet-review.webp';
import lookImage from '@/assets/pet-templates/default-pet-look.webp';
// 每个动作使用独立的 4×4 高清帧图集，避免为单个动画加载超大纹理。
export const PET_ANIMATIONS: Record<string, PetAnimation> = {
  idle: { image: idleImage, durationMs: 3200, loop: true },
  right: { image: facingImage, durationMs: 0, loop: false },
  left: { image: facingImage, durationMs: 0, loop: false },
  success: { image: successImage, durationMs: 0, loop: false },
  failure: { image: failureImage, durationMs: 1600, loop: false },
  waiting: { image: waitingImage, durationMs: 2400, loop: true },
  working: { image: workingImage, durationMs: 1600, loop: true },
  review: { image: reviewImage, durationMs: 2600, loop: true },
  look: { image: lookImage, durationMs: 0, loop: false },
};
// 顺时针八方向对应原地俯视、仰视及斜向姿势。
export const PET_LOOK_FRAMES = [2, 3, 1, 7, 6, 6, 0, 2];
