import { isNumber } from 'lodash-es';
// 描述界面用于选择文件类型图标的业务分类。
export type FileKind =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'ppt'
  | 'image'
  | 'video'
  | 'archive'
  | 'folder'
  | 'text';
// 建立扩展名到文件类型的映射，供列表、明细与结果页统一取图标。
const FILE_KIND_BY_EXTENSION: Record<string, FileKind> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  wps: 'word',
  rtfd: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  et: 'excel',
  ppt: 'ppt',
  pptx: 'ppt',
  dps: 'ppt',
  psd: 'image',
  ai: 'image',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  bmp: 'image',
  webp: 'image',
  svg: 'image',
  tif: 'image',
  tiff: 'image',
  heic: 'image',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  wmv: 'video',
  flv: 'video',
  webm: 'video',
  m4v: 'video',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  txt: 'text',
  md: 'text',
  json: 'text',
  log: 'text',
  ini: 'text',
  yml: 'text',
  yaml: 'text',
};
// 定义大小格式化使用的单位阶梯。
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
// 大小不可用或非法时界面展示的占位文案。
const FILE_SIZE_PLACEHOLDER = '—';
// 从路径中截取最后一段文件名，同时兼容 Windows 反斜杠与目录尾分隔符。
export function resolveFileName(path: string): string {
  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}
// 从路径中截取所在目录，文件位于磁盘根目录时返回空字符串。
export function resolveFileDirectory(path: string): string {
  const separatorIndex = Math.max(
    path.lastIndexOf('/'),
    path.lastIndexOf('\\'),
  );
  return separatorIndex > 0 ? path.slice(0, separatorIndex) : '';
}
// 按扩展名识别文件类型，目录与无扩展名文件分别归入文件夹与文本类型。
export function resolveFileKind(
  path: string,
  targetType: 'file' | 'directory' = 'file',
): FileKind {
  if (targetType === 'directory' || /[\\/]$/.test(path)) return 'folder';
  const name = resolveFileName(path);
  const separatorIndex = name.lastIndexOf('.');
  if (separatorIndex <= 0) return 'text';
  const extension = name.slice(separatorIndex + 1).toLowerCase();
  return FILE_KIND_BY_EXTENSION[extension] ?? 'text';
}
// 将字节数格式化为带单位的可读大小，非法或缺失的大小统一返回占位文案。
export function formatFileSize(size: number | null | undefined): string {
  if (!isNumber(size) || !Number.isFinite(size) || size < 0)
    return FILE_SIZE_PLACEHOLDER;
  if (size === 0) return '0 B';
  // 计算当前字节数落在的单位档位。
  const unitIndex = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    FILE_SIZE_UNITS.length - 1,
  );
  // 按档位换算后的数值。
  const value = size / 1024 ** unitIndex;
  // 字节档位保持整数，其余档位保留一位小数。
  const digits = unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
