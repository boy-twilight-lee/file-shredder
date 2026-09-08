import { ShredLog } from '@/type';
export interface RecordTableRow extends ShredLog {
  displayName: string;
  sourcePath: string;
  statusClass: string;
  statusLabel: string;
  targetIconName: string;
}
export interface RecordTableColumn {
  key: string;
  title: string;
  dataIndex: keyof Pick<
    RecordTableRow,
    'displayName' | 'sourcePath' | 'statusLabel' | 'timestamp'
  >;
  width: number;
  ellipsis: boolean;
  tooltip: boolean;
  cellType: 'default' | 'target' | 'status';
}
