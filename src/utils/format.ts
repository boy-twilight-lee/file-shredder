import dayjs from 'dayjs';

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatByteSize(bytes: number, fractionDigits = 1): string {
  const normalizedBytes = Math.max(0, Number.isFinite(bytes) ? bytes : 0);
  if (normalizedBytes < 1024) return `${Math.round(normalizedBytes)} B`;

  const unitIndex = Math.min(
    Math.floor(Math.log(normalizedBytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = normalizedBytes / 1024 ** unitIndex;
  return `${value.toFixed(fractionDigits)} ${BYTE_UNITS[unitIndex]}`;
}

export function formatDuration(durationMs: number): string {
  const normalizedDuration = Math.max(
    0,
    Number.isFinite(durationMs) ? Math.round(durationMs) : 0,
  );
  if (normalizedDuration < 1000) return `${normalizedDuration} ms`;
  if (normalizedDuration < 60000)
    return `${(normalizedDuration / 1000).toFixed(1)} s`;

  const minutes = Math.floor(normalizedDuration / 60000);
  const seconds = Math.round((normalizedDuration % 60000) / 1000);
  return `${minutes} min ${seconds} s`;
}

export function formatDateTime(
  value: string | number | Date,
  format: string,
): string {
  return dayjs(value).format(format);
}
