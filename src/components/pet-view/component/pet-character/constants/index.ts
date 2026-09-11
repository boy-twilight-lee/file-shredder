import { PetAnimation } from '../type';
import atlasImage from '@/assets/pet-templates/default-pet-atlas.webp';
import atlasLayout from '@/assets/pet-templates/default-pet-atlas.json';
// 所有默认形象状态共用一个图片地址，避免切换时重新解码和创建元素。
export const DEFAULT_PET_ATLAS = atlasImage;
// 读取素材构建脚本输出的列数，避免新增帧后与样式布局不一致。
export const PET_ATLAS_COLUMNS = atlasLayout.columns;
// 图集纵向帧数用于换算百分比坐标。
export const PET_ATLAS_ROWS = atlasLayout.rows;
// 停步缓冲、静默兜底、原地停留和方向确认均以毫秒计。
export const PET_MOTION_TIMING = {
  release: 160,
  silence: 320,
  rest: 650,
  direction: 70,
};
// 待机以睁眼为主，眨眼短暂停留；移动使用四张真实脚部动作帧。
export const PET_ANIMATIONS: Record<string, PetAnimation> = {
  idle: {
    frames: [
      0, 36, 32, 37, 33, 38, 34, 39, 35, 39, 34, 39, 35, 39, 34, 38, 33, 37, 32,
      36, 0, 1, 2, 0,
    ],
    holdsMs: [
      650, 90, 100, 100, 110, 100, 160, 90, 160, 90, 160, 90, 160, 90, 160, 100,
      110, 100, 100, 90, 1600, 550, 130, 1500,
    ],
    durationMs: 6590,
    loop: true,
  },
  right: { frames: [4, 5, 6, 7], durationMs: 640, loop: true },
  left: { frames: [24, 25, 26, 27], durationMs: 640, loop: true },
  'rest-right': { frames: [4], durationMs: 650, loop: false },
  'rest-left': { frames: [24], durationMs: 650, loop: false },
  working: { frames: [8, 9, 10, 11], durationMs: 1000, loop: true },
  success: { frames: [12, 13, 13, 12], durationMs: 1400, loop: false },
  failure: { frames: [14, 15, 14, 14], durationMs: 1800, loop: false },
  waiting: { frames: [16, 17], durationMs: 1800, loop: true },
  review: { frames: [18, 19], durationMs: 2200, loop: true },
};
// 顺时针八方向：右、右下、下、左下、左、左上、上、右上。
export const PET_LOOK_FRAMES = [4, 23, 21, 31, 24, 30, 20, 22];
