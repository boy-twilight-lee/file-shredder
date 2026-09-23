import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { App } from 'electron';
import { readJsonFile, writeJsonFile } from '../utils';
export interface AppSettings {
  passes: 0 | 3 | 7 | 35;
  removeRootDirectory: boolean;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  systemNotifications: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
}
export interface ShredLog {
  id: string;
  timestamp: string;
  path: string;
  success: boolean;
  category: 'success' | 'occupied' | 'permission' | 'protected' | 'unknown';
  message: string;
  targetType?: 'file' | 'directory';
  succeededCount?: number;
  failedCount?: number;
}
// 定义首次启动及旧设置缺省字段使用的应用设置。
const DEFAULT_SETTINGS: AppSettings = {
  // 新用户默认使用不覆写数据的极速删除模式。
  passes: 0,
  // 默认在清理文件夹时一并删除用户选中的根目录。
  removeRootDirectory: true,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  // 保留旧版本清理完成后会通知用户的默认行为。
  systemNotifications: true,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
};
// 解析持久化布尔设置，字段缺失或类型非法时回退到当前版本默认值。
function resolveStoredBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
// 解析持久化清理强度，取值不在当前支持范围内时回退到默认强度。
function resolveStoredPasses(value: unknown): 0 | 3 | 7 | 35 {
  return value === 3 || value === 7 || value === 35
    ? value
    : DEFAULT_SETTINGS.passes;
}
export class AppStore {
  // 保存应用设置文件路径。
  private readonly settingsPath: string;
  // 保存粉碎记录文件路径。
  private readonly logsPath: string;
  // 根据 Electron 用户数据目录初始化持久化路径。
  constructor(app: App) {
    // 读取当前应用隔离的用户数据目录。
    const dataDirectory = app.getPath('userData');
    this.settingsPath = join(dataDirectory, 'settings.json');
    this.logsPath = join(dataDirectory, 'shred-logs.json');
  }
  // 读取持久化设置，只采用当前版本支持的字段并补齐默认值。
  async getSettings(): Promise<AppSettings> {
    // 读取可能包含旧版本废弃字段的设置数据。
    const storedSettings = await readJsonFile<Record<string, unknown>>(
      this.settingsPath,
      {},
    );
    // 逐字段收敛旧配置，旧版本遗留字段不会写回，升级后自动清理。
    return {
      passes: resolveStoredPasses(storedSettings.passes),
      removeRootDirectory: resolveStoredBoolean(
        storedSettings.removeRootDirectory,
        DEFAULT_SETTINGS.removeRootDirectory,
      ),
      confirmBeforeShred: resolveStoredBoolean(
        storedSettings.confirmBeforeShred,
        DEFAULT_SETTINGS.confirmBeforeShred,
      ),
      alwaysOnTop: resolveStoredBoolean(
        storedSettings.alwaysOnTop,
        DEFAULT_SETTINGS.alwaysOnTop,
      ),
      launchAtLogin: resolveStoredBoolean(
        storedSettings.launchAtLogin,
        DEFAULT_SETTINGS.launchAtLogin,
      ),
      systemNotifications: resolveStoredBoolean(
        storedSettings.systemNotifications,
        DEFAULT_SETTINGS.systemNotifications,
      ),
      contextMenuInstalled: resolveStoredBoolean(
        storedSettings.contextMenuInstalled,
        DEFAULT_SETTINGS.contextMenuInstalled,
      ),
      contextMenuAutoInstall: false,
    };
  }
  // 判断用户数据目录中是否已存在设置文件，用于区分首次安装与升级安装。
  async hasStoredSettings(): Promise<boolean> {
    try {
      await access(this.settingsPath);
      return true;
    } catch {
      // 设置文件不存在时视为首次安装。
      return false;
    }
  }
  // 合并并持久化部分应用设置。
  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    // 合并已有设置与本次更新字段。
    const settings = { ...(await this.getSettings()), ...patch };
    await writeJsonFile(this.settingsPath, settings);
    return settings;
  }
  // 读取全部本地粉碎记录。
  async getLogs(): Promise<ShredLog[]> {
    return readJsonFile<ShredLog[]>(this.logsPath, []);
  }
  // 将新粉碎记录追加到本地记录文件头部。
  async appendLogs(
    entries: Omit<ShredLog, 'id' | 'timestamp'>[],
  ): Promise<void> {
    // 读取已有记录供本次追加合并。
    const logs = await this.getLogs();
    // 为本批记录生成统一的完成时间。
    const timestamp = new Date().toISOString();
    // 为保留的记录补充唯一标识与时间戳。
    const appendedLogs = entries.map((entry) => ({
      ...entry,
      id: randomUUID(),
      timestamp,
    }));
    await writeJsonFile(this.logsPath, [...appendedLogs, ...logs]);
  }
  // 清空全部本地粉碎记录。
  async clearLogs(): Promise<void> {
    await writeJsonFile(this.logsPath, []);
  }
  // 删除指定粉碎记录并返回剩余列表。
  async deleteLogs(ids: string[]): Promise<ShredLog[]> {
    if (ids.length === 0) return this.getLogs();
    // 汇总待删除记录标识以提高筛选效率。
    const deletedIds = new Set(ids);
    // 保留未命中删除集合的本地记录。
    const logs = (await this.getLogs()).filter(
      (log) => !deletedIds.has(log.id),
    );
    await writeJsonFile(this.logsPath, logs);
    return logs;
  }
  // 删除应用设置与全部粉碎记录。
  async cleanup(): Promise<void> {
    await Promise.all([
      rm(this.settingsPath, { force: true }),
      rm(this.logsPath, { force: true }),
    ]);
  }
}
