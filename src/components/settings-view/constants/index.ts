export const PET_SIZE_SAVE_DELAY_MS = 300;

export const SHRED_LEVEL_OPTIONS = [
  {
    value: 3,
    title: '日常清理',
    badge: '推荐',
    description: '覆写 3 次，速度较快，适合普通文件和日常使用。',
  },
  {
    value: 7,
    title: '加强清理',
    badge: '更安全',
    description: '覆写 7 次，耗时更长，适合包含隐私的文件。',
  },
  {
    value: 35,
    title: '深度清理',
    badge: '非常慢',
    description: '覆写 35 次，会显著增加耗时，仅在确有需要时使用。',
  },
] as const;
