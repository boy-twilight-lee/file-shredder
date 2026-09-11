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
// 24fps 动作定义由素材脚本生成，真实帧数和播放时长保持一致。
export const PET_ANIMATIONS: Record<string, PetAnimation> =
  atlasLayout.animations;
// 方向静态姿势也读取同一图集元数据。
export const PET_LOOK_FRAMES = atlasLayout.look_frames;
