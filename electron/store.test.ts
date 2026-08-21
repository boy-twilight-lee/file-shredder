import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { App } from 'electron';
import { AppStore } from './store';

const temporaryDirectories: string[] = [];

async function createStore(): Promise<AppStore> {
  const directory = await mkdtemp(join(tmpdir(), 'file-shredder-store-'));
  temporaryDirectories.push(directory);
  const app = { getPath: () => directory } as unknown as App;
  return new AppStore(app);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('AppStore.deleteLogs', () => {
  it('支持按 id 批量删除并保留未选记录', async () => {
    const store = await createStore();
    await store.appendLogs([
      { path: 'C:\\first.txt', success: true, category: 'success', message: '粉碎成功' },
      { path: 'C:\\second.txt', success: false, category: 'occupied', message: '文件被占用' },
      { path: 'C:\\third.txt', success: true, category: 'success', message: '粉碎成功' },
    ]);
    const logs = await store.getLogs();

    const remainingLogs = await store.deleteLogs([logs[0].id, logs[2].id]);

    expect(remainingLogs).toHaveLength(1);
    expect(remainingLogs[0].id).toBe(logs[1].id);
    await expect(store.getLogs()).resolves.toEqual(remainingLogs);
  });
});
