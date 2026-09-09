import { RecordTableColumn } from '../type';
// 定义记录表格每页可选的展示数量。
export const RECORD_PAGE_SIZE_OPTIONS = [50, 100, 150, 200];
// 定义记录表格首次打开时的默认每页数量。
export const DEFAULT_RECORD_PAGE_SIZE = RECORD_PAGE_SIZE_OPTIONS[1];
// 定义粉碎记录表格的列标题、字段及展示方式。
export const RECORD_TABLE_COLUMNS: RecordTableColumn[] = [
  {
    key: 'target',
    title: '目标名称',
    dataIndex: 'displayName',
    width: 174,
    ellipsis: true,
    tooltip: true,
    cellType: 'target',
  },
  {
    key: 'source',
    title: '来源位置',
    dataIndex: 'sourcePath',
    width: 244,
    ellipsis: true,
    tooltip: true,
    cellType: 'default',
  },
  {
    key: 'status',
    title: '粉碎状态',
    dataIndex: 'statusLabel',
    width: 94,
    ellipsis: false,
    tooltip: false,
    cellType: 'status',
  },
  {
    key: 'timestamp',
    title: '执行时间',
    dataIndex: 'timestamp',
    width: 136,
    ellipsis: true,
    tooltip: true,
    cellType: 'default',
  },
];
