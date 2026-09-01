import { TableColumnData, TableRowSelection } from '@arco-design/web-vue';
import { VirtualListProps } from '@arco-design/web-vue/es/_components/virtual-list-v2/interface';
// 定义粉碎记录表格的业务列及展示宽度。
export const SHRED_RECORD_COLUMNS: TableColumnData[] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    slotName: 'path-cell',
    width: 356,
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
    width: 200,
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '粉碎时间',
    dataIndex: 'timestamp',
    slotName: 'time-cell',
    width: 150,
    ellipsis: true,
    tooltip: true,
  },
];
// 定义粉碎记录表格的多选行为。
export const SHRED_RECORD_ROW_SELECTION: TableRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  width: 44,
  fixed: true,
};
// 横向尺寸等于选择列和所有数据列之和，空间不足时由 Arco 提供横向滚动。
export const SHRED_RECORD_TABLE_SCROLL = { x: 850, y: 406 };
// 定义粉碎记录时间的统一展示格式。
export const SHRED_RECORD_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
// 定义长记录列表的虚拟滚动参数。
export const SHRED_RECORD_VIRTUAL_LIST_PROPS: VirtualListProps = {
  height: 406,
  threshold: 20,
  fixedSize: true,
  estimatedSize: 44,
  buffer: 8,
};
