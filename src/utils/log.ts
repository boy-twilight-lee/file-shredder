import dayjs from 'dayjs';
import {
  ShredLog,
  ShredLogFilter,
  ShredLogFilterResult,
  ShredLogRangePreset,
  ShredPasses,
} from '@/type';
import { formatDateTime } from './format';
import { isShredPasses, resolvePassesLabel } from './shred';
// 各时间范围预置档位相对今天向前的天数跨度，全部时间不限制。
const LOG_RANGE_DAYS: Record<ShredLogRangePreset, number> = {
  all: 0,
  today: 0,
  week: 6,
  month: 29,
};
// 记录导出 CSV 的表头，顺序与每行取值一一对应。
const LOG_CSV_HEADER = [
  '记录编号',
  '清理时间',
  '目标路径',
  '目标类型',
  '清理级别',
  '执行结果',
  '说明',
];
// 创建一份记录页的初始筛选条件，避免多个调用方共享同一可变对象。
export function createLogFilter(): ShredLogFilter {
  return {
    keyword: '',
    result: 'all',
    passes: 'all',
    range: null,
  };
}
// 按时间范围预置档位计算记录筛选使用的起止日期。
export function resolveLogRange(
  preset: ShredLogRangePreset,
): [string, string] | null {
  if (preset === 'all') return null;
  // 以今天为终点按档位跨度回推起始日期。
  const end = dayjs();
  const start = end.subtract(LOG_RANGE_DAYS[preset], 'day');
  return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
}
// 判定外部传入的取值是否为受支持的记录结果筛选值。
function isLogFilterResult(value: unknown): value is ShredLogFilterResult {
  return value === 'all' || value === 'success' || value === 'failure';
}
// 按筛选条件过滤本地清理记录，未识别的条件按「不限制」处理。
export function filterShredLogs(
  logs: ShredLog[],
  filter: ShredLogFilter,
): ShredLog[] {
  // 归一化模糊搜索关键字，忽略大小写与首尾空白。
  const keyword = filter.keyword.trim().toLowerCase();
  // 归一化结果维度，非法取值视为不限制。
  const result = isLogFilterResult(filter.result) ? filter.result : 'all';
  // 归一化清理级别维度，非法取值视为不限制。
  const passes: ShredPasses | 'all' = isShredPasses(filter.passes)
    ? filter.passes
    : 'all';
  // 归一化时间范围，缺失或非法时视为不限制。
  const rangeStart = filter.range?.[0]
    ? dayjs(filter.range[0]).startOf('day')
    : null;
  const rangeEnd = filter.range?.[1]
    ? dayjs(filter.range[1]).endOf('day')
    : null;
  return logs.filter((log) => {
    if (keyword && !log.path.toLowerCase().includes(keyword)) return false;
    if (result === 'success' && !log.success) return false;
    if (result === 'failure' && log.success) return false;
    if (passes !== 'all' && log.passes !== passes) return false;
    // 时间戳无法解析时按不满足时间范围处理，避免误命中。
    const timestamp = dayjs(log.timestamp);
    if (rangeStart?.isValid()) {
      if (!timestamp.isValid() || timestamp.isBefore(rangeStart)) return false;
    }
    if (rangeEnd?.isValid()) {
      if (!timestamp.isValid() || timestamp.isAfter(rangeEnd)) return false;
    }
    return true;
  });
}
// 按页码与每页条数截取当前页记录。
export function paginateShredLogs(
  logs: ShredLog[],
  current: number,
  pageSize: number,
): ShredLog[] {
  if (pageSize <= 0) return logs;
  // 收敛页码，避免越界页码返回空列表。
  const safeCurrent = Math.max(1, Math.floor(current));
  const start = (safeCurrent - 1) * pageSize;
  return logs.slice(start, start + pageSize);
}
// 按总条数与每页条数计算总页数，至少返回 1 页。
export function countShredLogPages(total: number, pageSize: number): number {
  if (pageSize <= 0 || total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
// 转义 CSV 单元格，包含逗号、引号或换行时按 CSV 规范包裹双引号。
function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
// 将清理记录序列化为可导出的 CSV 文本。
export function serializeShredLogsToCsv(logs: ShredLog[]): string {
  // 逐行展开记录字段，导出内容与记录页表格保持一致的口径。
  const rows = logs.map((log) => [
    log.id,
    formatDateTime(log.timestamp),
    log.path,
    log.targetType === 'directory' ? '文件夹' : '文件',
    isShredPasses(log.passes) ? resolvePassesLabel(log.passes) : '—',
    log.success ? '清理成功' : '清理失败',
    log.message,
  ]);
  return [LOG_CSV_HEADER, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
}
