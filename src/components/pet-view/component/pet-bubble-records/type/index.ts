import { ShredLog } from '@/type';
export interface RecordTableRow extends ShredLog {
  displayName: string;
  sourcePath: string;
  statusClass: string;
  statusLabel: string;
  targetIconName: string;
}
