// 从跨平台路径中提取末级文件或目录名称。
export function getPathName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

// 从跨平台路径中提取目标所属的父级目录路径。
export function getPathDirectory(path: string): string {
  // 移除末尾分隔符，确保目录路径仍按末级名称处理。
  const normalizedPath = path.replace(/[\\/]+$/, '');
  // 同时兼容 Windows 与 POSIX 路径分隔符。
  const separatorIndex = Math.max(
    normalizedPath.lastIndexOf('\\'),
    normalizedPath.lastIndexOf('/'),
  );
  if (separatorIndex < 0) return '';
  // 保留根目录分隔符，避免来源路径展示为不完整的盘符或空文本。
  const directoryPath = normalizedPath.slice(0, separatorIndex);
  if (!directoryPath) return normalizedPath.slice(0, separatorIndex + 1);
  if (/^[A-Za-z]:$/.test(directoryPath))
    return normalizedPath.slice(0, separatorIndex + 1);
  return directoryPath;
}
