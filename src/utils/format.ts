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
