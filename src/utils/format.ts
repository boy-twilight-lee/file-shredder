import dayjs from 'dayjs';
// 定义文件大小展示支持的二进制单位。
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
// 将字节数转换为适合界面展示的容量文本。
export function formatByteSize(bytes: number, fractionDigits = 1): string {
  // 将无效或负数字节数收敛为零。
  const normalizedBytes = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  if (normalizedBytes < 1024) return `${Math.round(normalizedBytes)} B`;
  // 选择输入容量可用的最大展示单位。
  const unitIndex = Math.min(
    Math.floor(Math.log(normalizedBytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  // 换算目标单位下的容量数值。
  const value = normalizedBytes / 1024 ** unitIndex;
  return `${value.toFixed(fractionDigits)} ${BYTE_UNITS[unitIndex]}`;
}
// 将毫秒耗时转换为紧凑的用户可读文本。
export function formatDuration(durationMs: number): string {
  // 将无效或负数耗时收敛为非负整数。
  const normalizedDuration = Math.max(
    0,
    Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
  );
  if (normalizedDuration < 1000) return `${normalizedDuration} ms`;
  if (normalizedDuration < 60000)
    return `${(normalizedDuration / 1000).toFixed(1)} s`;
  // 提取完整分钟数。
  const minutes = Math.floor(normalizedDuration / 60000);
  // 提取扣除分钟后的秒数。
  const seconds = Math.round((normalizedDuration % 60000) / 1000);
  return `${minutes} min ${seconds} s`;
}
// 按指定模板格式化日期时间值。
export function formatDateTime(
  value: string | number | Date,
  format: string,
): string {
  return dayjs(value).format(format);
}
// 按记录发生日期生成紧凑的相对时间文本。
export function formatRecordTime(
  value: string | number | Date,
  referenceTime: string | number | Date = Date.now(),
): string {
  // 解析记录时间与用于判断日期边界的参照时间。
  const recordTime = dayjs(value);
  // 固定参照时刻，避免跨越午夜时产生不一致结果。
  const currentTime = dayjs(referenceTime);
  if (!recordTime.isValid() || !currentTime.isValid()) return '';
  if (recordTime.isSame(currentTime, 'day'))
    return `今天 ${recordTime.format('HH:mm')}`;
  if (recordTime.isSame(currentTime.subtract(1, 'day'), 'day'))
    return `昨天 ${recordTime.format('HH:mm')}`;
  if (recordTime.isSame(currentTime, 'year'))
    return recordTime.format('MM月DD日');
  return recordTime.format('YYYY年MM月');
}
