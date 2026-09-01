import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { App } from 'electron';
import { AppStore } from './store';
// 收集每个测试创建的临时数据目录。
const temporaryDirectories: string[] = [];
// 创建使用独立临时目录的应用存储实例。
async function createStore(): Promise<AppStore> {
  // 创建本次测试隔离的用户数据目录。
  const directory = await mkdtemp(join(tmpdir(), 'file-shredder-store-'));
  temporaryDirectories.push(directory);
  // 模拟仅提供用户数据目录能力的 Electron 应用。
  const app = { getPath: () => directory } as unknown as App;
  return new AppStore(app);
}
// 每项测试结束后删除全部临时数据目录。
afterEach(async () => {
  // 并行清理测试期间登记的临时目录。
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});
// 验证应用设置读取与默认值合并。
describe('AppStore.getSettings', () => {
  // 验证新用户获得极速模式且不包含旧字段。
  it('新用户默认使用极速删除模式', async () => {
    // 创建隔离的空应用存储。
    const store = await createStore();
    await expect(store.getSettings()).resolves.toMatchObject({
      passes: 0,
      systemNotifications: true,
      bubbleAppTitle: '文件粉碎精灵',
      bubbleAppIconPath: '',
    });
    await expect(store.getSettings()).resolves.not.toHaveProperty('shortcut');
  });
});
// 验证粉碎记录按标识删除。
describe('AppStore.deleteLogs', () => {
  // 验证批量删除仅移除用户指定的记录。
  it('支持按 id 批量删除并保留未选记录', async () => {
    // 创建隔离的应用存储。
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
    // 读取追加后的完整记录列表。
    const logs = await store.getLogs();
    // 删除第一与第三条记录并保存剩余结果。
    const remainingLogs = await store.deleteLogs([logs[0].id, logs[2].id]);
    expect(remainingLogs).toHaveLength(1);
    expect(remainingLogs[0].id).toBe(logs[1].id);
    await expect(store.getLogs()).resolves.toEqual(remainingLogs);
  });
});
// 验证粉碎记录追加与数量上限。
describe('AppStore.appendLogs', () => {
  // 验证超大批次只持久化允许的最大记录数量。
  it('超大批次仅持久化记录上限内的数据', async () => {
    // 创建隔离的应用存储。
    const store = await createStore();
    // 生成超过持久化上限的测试记录。
    const entries = Array.from({ length: 1500 }, (_, index) => ({
      path: `C:\\batch\\${index}.txt`,
      success: true,
      category: 'success' as const,
      message: '粉碎成功',
    }));
    await store.appendLogs(entries);
    // 读取截断后的持久化记录。
    const logs = await store.getLogs();
    expect(logs).toHaveLength(1000);
    expect(logs[0].path).toBe('C:\\batch\\0.txt');
    expect(logs[999].path).toBe('C:\\batch\\999.txt');
  });
});
