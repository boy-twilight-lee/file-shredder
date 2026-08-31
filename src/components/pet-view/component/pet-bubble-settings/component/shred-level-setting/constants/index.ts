import type { AppSettings } from '@/type';

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

export const SHRED_LEVEL_ICONS: Record<AppSettings['passes'], string> = {
  0: 'app-delete',
  3: 'app-lightning',
  7: 'app-shield',
  35: 'app-storage',
};
