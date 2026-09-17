import { BubbleAlign, BubbleDirection } from '@/type';
// 定义应用在气泡与设置预览中展示的名称。
export const APP_NAME = '文件粉碎精灵';
// 定义操作气泡相对桌宠的默认方位。
export const DEFAULT_BUBBLE_DIRECTION: BubbleDirection = 'left';
// 定义操作气泡相对桌宠的默认对齐方式。
export const DEFAULT_BUBBLE_ALIGN: BubbleAlign = 'center';
// 定义桌宠窗口为人物动效与阴影预留的边缘留白。
export const PET_WINDOW_PADDING = 30;
// 定义操作气泡与桌宠之间的定位间距。
export const PET_BUBBLE_GAP = 10;
// 定义操作气泡支持的最大外框尺寸，窗口在气泡所在侧按一份该尺寸预留空间。
export const PET_BUBBLE_MAX_SIZE = { width: 700, height: 500 };
// 定义气泡对齐变化时气泡位置过渡的时长。
export const PET_ALIGN_TRANSITION_DURATION_MS = 220;
// 定义气泡对齐过渡使用的缓出曲线，桌宠气泡与设置预览共用同一节奏。
export const PET_ALIGN_TRANSITION_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';
