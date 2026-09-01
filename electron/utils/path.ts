import { isAbsolute, relative } from 'node:path';
// 判断目标路径是否位于指定目录内部或等于该目录。
export function isPathWithinDirectory(
  directoryPath: string,
  targetPath: string,
): boolean {
  // 计算目标相对指定目录的跨平台路径。
  const relativePath = relative(directoryPath, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}
