import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { App } from 'electron';
import { readJsonFile, writeJsonFile } from '../utils';

export interface AppSettings {
  passes: 0 | 3 | 7 | 35;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  systemNotifications: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
  customPetImagePath: string;
  petImageTemplateId: string;
  uploadedPetImages: UploadedPetImage[];
  petSize: number;
  petDisplayId: number | null;
  petPositionX: number | null;
  petPositionY: number | null;
}

export interface UploadedPetImage {
  id: string;
  name: string;
  fileName: string;
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

const DEFAULT_SETTINGS: AppSettings = {
  // 新用户默认使用不覆写数据的极速删除模式。
  passes: 0,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  // 保留旧版本清理完成后会通知用户的默认行为。
  systemNotifications: true,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petImageTemplateId: 'built-in-ao-yin',
  uploadedPetImages: [],
  petSize: 200,
  petDisplayId: null,
  petPositionX: null,
  petPositionY: null,
};
const MAX_LOG_COUNT = 1000;

export class AppStore {
  private readonly settingsPath: string;
  private readonly logsPath: string;
  private readonly petImagePath: string;
  private readonly petImagesDirectory: string;

  constructor(app: App) {
    const dataDirectory = app.getPath('userData');
    this.settingsPath = join(dataDirectory, 'settings.json');
    this.logsPath = join(dataDirectory, 'shred-logs.json');
    this.petImagePath = join(dataDirectory, 'custom-pet.png');
    this.petImagesDirectory = join(dataDirectory, 'pet-templates');
  }

  async getSettings(): Promise<AppSettings> {
    const storedSettings = await readJsonFile<
      Partial<AppSettings> & { shortcut?: string; snapToEdge?: boolean }
    >(this.settingsPath, {});
    // 清除旧版本遗留且界面已不再提供的配置，后续保存时不会再写回。
    delete storedSettings.shortcut;
    delete storedSettings.snapToEdge;
    return { ...DEFAULT_SETTINGS, ...storedSettings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const settings = { ...(await this.getSettings()), ...patch };
    await writeJsonFile(this.settingsPath, settings);
    return settings;
  }

  async getLogs(): Promise<ShredLog[]> {
    return readJsonFile<ShredLog[]>(this.logsPath, []);
  }

  async appendLogs(
    entries: Omit<ShredLog, 'id' | 'timestamp'>[],
  ): Promise<void> {
    const logs = await this.getLogs();
    const timestamp = new Date().toISOString();
    // 先截断再生成 UUID，避免超大批次为最终不会展示的记录分配大量对象。
    const availableEntryCount = Math.min(entries.length, MAX_LOG_COUNT);
    const appendedLogs = entries
      .slice(0, availableEntryCount)
      .map((entry) => ({ ...entry, id: randomUUID(), timestamp }));
    await writeJsonFile(
      this.logsPath,
      [...appendedLogs, ...logs].slice(0, MAX_LOG_COUNT),
    );
  }

  async clearLogs(): Promise<void> {
    await writeJsonFile(this.logsPath, []);
  }

  async deleteLogs(ids: string[]): Promise<ShredLog[]> {
    if (ids.length === 0) return this.getLogs();
    const deletedIds = new Set(ids);
    const logs = (await this.getLogs()).filter(
      (log) => !deletedIds.has(log.id),
    );
    await writeJsonFile(this.logsPath, logs);
    return logs;
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      rm(this.settingsPath, { force: true }),
      rm(this.logsPath, { force: true }),
      rm(this.petImagePath, { force: true }),
      rm(this.petImagesDirectory, { force: true, recursive: true }),
    ]);
  }
}
