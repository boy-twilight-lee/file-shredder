import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
// 读取 JSON 文件，并在文件缺失或内容损坏时返回默认值。
export async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === 'ENOENT' ||
      error instanceof SyntaxError
    )
      return fallback;
    throw error;
  }
}
// 创建父目录并以 UTF-8 格式写入 JSON 文件。
export async function writeJsonFile(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
}
