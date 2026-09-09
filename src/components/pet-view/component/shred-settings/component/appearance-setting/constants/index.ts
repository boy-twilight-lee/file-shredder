// 限制桌宠可设置的最小显示尺寸。
export const PET_SIZE_MIN = 50;
// 限制桌宠可设置的最大显示尺寸。
export const PET_SIZE_MAX = 400;
// 定义桌宠尺寸控件的单次调整步长。
export const PET_SIZE_STEP = 4;
// 定义静态预览中操作气泡相对于真实尺寸的缩放比例。
export const PET_PREVIEW_BUBBLE_SCALE = 0.7;
// 定义静态预览中缩放后操作气泡的显示宽度。
export const PET_PREVIEW_BUBBLE_WIDTH = Math.round(
  380 * PET_PREVIEW_BUBBLE_SCALE,
);
// 定义静态预览中缩放后操作气泡的显示高度。
export const PET_PREVIEW_BUBBLE_HEIGHT = Math.round(
  398 * PET_PREVIEW_BUBBLE_SCALE,
);
// 定义静态预览中人物与操作气泡的真实间距。
export const PET_PREVIEW_GAP = 14;
// 定义静态预览场景四周的真实留白。
export const PET_PREVIEW_PADDING = 30;
