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
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('AppStore.getSettings', () => {
  it('新用户默认使用极速删除模式', async () => {
    const store = await createStore();

    await expect(store.getSettings()).resolves.toMatchObject({ passes: 0 });
  });
});

describe('AppStore.deleteLogs', () => {
  it('支持按 id 批量删除并保留未选记录', async () => {
    const store = await createStore();
    await store.appendLogs([
      {
        path: 'C:\\first.txt',
        success: true,
        category: 'success',
        message: '粉碎成功',
      },
      {
        path: 'C:\\second.txt',
        success: false,
        category: 'occupied',
        message: '文件被占用',
      },
      {
        path: 'C:\\third.txt',
        success: true,
        category: 'success',
        message: '粉碎成功',
      },
    ]);
    const logs = await store.getLogs();

    const remainingLogs = await store.deleteLogs([logs[0].id, logs[2].id]);

    expect(remainingLogs).toHaveLength(1);
    expect(remainingLogs[0].id).toBe(logs[1].id);
    await expect(store.getLogs()).resolves.toEqual(remainingLogs);
  });
});

describe('AppStore.appendLogs', () => {
  it('超大批次仅持久化记录上限内的数据', async () => {
    const store = await createStore();
    const entries = Array.from({ length: 1500 }, (_, index) => ({
      path: `C:\\batch\\${index}.txt`,
      success: true,
      category: 'success' as const,
      message: '粉碎成功',
    }));

    await store.appendLogs(entries);

    const logs = await store.getLogs();
    expect(logs).toHaveLength(1000);
    expect(logs[0].path).toBe('C:\\batch\\0.txt');
    expect(logs[999].path).toBe('C:\\batch\\999.txt');
  });
});
