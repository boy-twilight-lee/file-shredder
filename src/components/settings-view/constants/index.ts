import type {
  ButtonProps,
  TableColumnData,
  TableRowSelection,
} from '@arco-design/web-vue';

export const PET_SIZE_SAVE_DELAY_MS = 300;
export const PET_SIZE_MIN = 50;
export const PET_SIZE_MAX = 700;
export const PET_SIZE_STEP = 4;
export const RECORD_PAGE_SIZE = 10;
export const RECORD_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
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
    descriptionLines: ['不覆写数据，直接删除文件', '删除后的内容可能被恢复'],
  },
  {
    value: 3,
    title: '日常清理',
    badge: '推荐',
    descriptionLines: ['覆写 3 次，速度较快', '适合普通文件和日常使用'],
  },
  {
    value: 7,
    title: '加强清理',
    badge: '更安全',
    descriptionLines: ['覆写 7 次，耗时更长', '适合包含隐私的文件'],
  },
  {
    value: 35,
    title: '深度清理',
    badge: '非常慢',
    descriptionLines: ['覆写 35 次，耗时很长', '仅在确有需要时使用'],
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
