import type { TableColumnData, TableRowSelection } from '@arco-design/web-vue';
import type { VirtualListProps } from '@arco-design/web-vue/es/_components/virtual-list-v2/interface';

export const SHRED_RECORD_COLUMNS: TableColumnData[] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    slotName: 'path-cell',
    width: 250,
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '状态',
    dataIndex: 'success',
    slotName: 'status-cell',
    width: 100,
  },
  {
    title: '处理结果',
    dataIndex: 'message',
    slotName: 'result-cell',
    width: 250,
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '粉碎时间',
    dataIndex: 'timestamp',
    slotName: 'time-cell',
    width: 160,
    ellipsis: true,
    tooltip: true,
  },
];

export const SHRED_RECORD_ROW_SELECTION: TableRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  width: 44,
  fixed: true,
};

// 横向尺寸等于选择列和所有数据列之和，空间不足时由 Arco 提供横向滚动。
export const SHRED_RECORD_TABLE_SCROLL = { x: 804, y: 406 };
export const SHRED_RECORD_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

export const SHRED_RECORD_VIRTUAL_LIST_PROPS: VirtualListProps = {
  height: 406,
  threshold: 20,
  fixedSize: true,
  estimatedSize: 44,
  buffer: 8,
};
