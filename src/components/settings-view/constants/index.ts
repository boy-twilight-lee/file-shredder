import type { ButtonProps } from '@arco-design/web-vue';

export const PET_SIZE_SAVE_DELAY_MS = 300;
export const PET_SIZE_MIN = 50;
export const PET_SIZE_MAX = 700;
export const PET_SIZE_STEP = 4;
// 设置页的确认浮层统一使用中等尺寸，避免 Arco 默认 mini 按钮过于紧凑。
export const MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS: ButtonProps = {
  size: 'medium',
  type: 'outline',
};
export const MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS: ButtonProps = {
  size: 'medium',
  type: 'primary',
};

export const SHRED_LEVEL_OPTIONS = [
  {
    value: 0,
    title: '极速删除',
    badge: '最快',
    description: '直接删除，不覆写',
  },
  {
    value: 3,
    title: '日常清理',
    badge: '推荐',
    description: '覆写 3 次，适合日常',
  },
  {
    value: 7,
    title: '加强清理',
    badge: '更安全',
    description: '覆写 7 次，更安全',
  },
  {
    value: 35,
    title: '深度清理',
    badge: '非常慢',
    description: '覆写 35 次，耗时较长',
  },
] as const;
