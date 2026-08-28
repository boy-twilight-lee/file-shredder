import { isAbsolute, relative } from 'node:path';

export function isPathWithinDirectory(
  directoryPath: string,
  targetPath: string,
): boolean {
  const relativePath = relative(directoryPath, targetPath);
  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
}
