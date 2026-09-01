// 从跨平台路径中提取末级文件或目录名称。
export function getPathName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
