import { SettingOption } from '../type';
import { BubbleAlign, BubbleDirection } from '@/type';
import { PET_BUBBLE_MAX_SIZE } from '@/constants';
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
// 定义设置页页头占用高度，与 shred-page-header 保持一致。
export const SETTINGS_PAGE_HEADER_HEIGHT = 40;
// 定义设置页列表的上下内边距，与 shred-settings 保持一致。
export const SETTINGS_PAGE_LIST_PADDING = 10;
// 定义设置卡片内边距，与列表下发的卡片内边距保持一致。
export const SETTINGS_CARD_PADDING = 12;
// 定义设置卡片标题区高度，由标题 20、间距 4 与说明 18 组成。
export const SETTINGS_CARD_TITLE_HEIGHT = 42;
// 定义设置卡片标题区与内容之间的间距。
export const SETTINGS_CARD_GAP = 16;
// 按设置页固定高度扣除页头、列表内边距、卡片内边距、卡片标题区与卡片间距得到预览面板高度。
export const PET_PREVIEW_HEIGHT =
  PET_BUBBLE_MAX_SIZE.height -
  SETTINGS_PAGE_HEADER_HEIGHT -
  SETTINGS_PAGE_LIST_PADDING * 2 -
  SETTINGS_CARD_PADDING * 2 -
  SETTINGS_CARD_TITLE_HEIGHT -
  SETTINGS_CARD_GAP;
// 定义操作气泡相对桌宠的方位可选项。
export const BUBBLE_DIRECTION_OPTIONS: SettingOption<BubbleDirection>[] = [
  { label: '居左', value: 'left', icon: 'app-align-left' },
  { label: '居右', value: 'right', icon: 'app-align-right' },
];
// 定义操作气泡相对桌宠的对齐方式可选项。
export const BUBBLE_ALIGN_OPTIONS: SettingOption<BubbleAlign>[] = [
  { label: '顶部', value: 'top', icon: 'app-align-top' },
  { label: '居中', value: 'center', icon: 'app-align-center' },
  { label: '底部', value: 'bottom', icon: 'app-align-bottom' },
];
