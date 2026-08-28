export function getPathName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
