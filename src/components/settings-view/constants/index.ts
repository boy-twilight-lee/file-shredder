import type { TableColumnData, TableRowSelection } from '@arco-design/web-vue';

export const PET_SIZE_SAVE_DELAY_MS = 300;
export const RECORD_PAGE_SIZE = 10;
export const RECORD_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

export const RECORD_TABLE_COLUMNS: TableColumnData[] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    slotName: 'path',
    ellipsis: true,
    tooltip: true,
  },
  { title: '时间', dataIndex: 'timestamp', slotName: 'time', width: 132 },
  {
    title: '状态',
    dataIndex: 'success',
    slotName: 'status',
    width: 120,
    align: 'center',
  },
  {
    title: '错误原因',
    dataIndex: 'message',
    slotName: 'message',
    ellipsis: true,
    tooltip: true,
  },
  { title: '操作', slotName: 'actions', width: 120, align: 'center' },
];

export const RECORD_ROW_SELECTION: TableRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  width: 36,
};
