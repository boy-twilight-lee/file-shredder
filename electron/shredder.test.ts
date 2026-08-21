import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { shredPaths } from './shredder';

describe('shredPaths', () => {
  it('overwrites and removes a regular file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pet-shredder-'));
    const targetPath = join(directory, 'secret.txt');
    await writeFile(targetPath, 'sensitive data', 'utf8');

    const result = await shredPaths([targetPath], 3, () => undefined);

    expect(result).toEqual([{ path: targetPath, success: true }]);
    await expect(readFile(targetPath)).rejects.toThrow();
  });

  it('refuses a filesystem root', async () => {
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    const result = await shredPaths([rootPath], 3, () => undefined);
    expect(result[0]).toMatchObject({ success: false, error: '拒绝粉碎磁盘根目录' });
  });
});
