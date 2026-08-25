import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { App } from 'electron';

export interface AppSettings {
  shortcut: string;
  passes: 0 | 3 | 7 | 35;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
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
  shortcut: 'CommandOrControl+Shift+Delete',
  // 新用户默认使用不覆写数据的极速删除模式。
  passes: 0,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
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

  private async readJson<T>(path: string, fallback: T): Promise<T> {
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

  private async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
  }

  async getSettings(): Promise<AppSettings> {
    const storedSettings = await this.readJson<
      Partial<AppSettings> & { snapToEdge?: boolean }
    >(this.settingsPath, {});
    // 清除旧版本遗留的吸附选项，后续保存时不会再写回配置文件。
    delete storedSettings.snapToEdge;
    return { ...DEFAULT_SETTINGS, ...storedSettings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const settings = { ...(await this.getSettings()), ...patch };
    await this.writeJson(this.settingsPath, settings);
    return settings;
  }

  async getLogs(): Promise<ShredLog[]> {
    return this.readJson<ShredLog[]>(this.logsPath, []);
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
    await this.writeJson(
      this.logsPath,
      [...appendedLogs, ...logs].slice(0, MAX_LOG_COUNT),
    );
  }

  async clearLogs(): Promise<void> {
    await this.writeJson(this.logsPath, []);
  }

  async deleteLogs(ids: string[]): Promise<ShredLog[]> {
    if (ids.length === 0) return this.getLogs();
    const deletedIds = new Set(ids);
    const logs = (await this.getLogs()).filter(
      (log) => !deletedIds.has(log.id),
    );
    await this.writeJson(this.logsPath, logs);
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
