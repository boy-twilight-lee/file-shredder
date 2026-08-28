export function toCssSize(
  value: number | string | undefined,
  fallback = '',
): string {
  if (value === undefined) return fallback;
  return typeof value === 'number' ? `${value}px` : value;
}
