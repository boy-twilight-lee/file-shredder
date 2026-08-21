import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { App } from 'electron';

export interface AppSettings {
  shortcut: string;
  passes: 3 | 7 | 35;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  launchAtLogin: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
  customPetImagePath: string;
  petSize: number;
}

export interface ShredLog {
  id: string;
  timestamp: string;
  path: string;
  success: boolean;
  category: 'success' | 'occupied' | 'permission' | 'protected' | 'unknown';
  message: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  shortcut: 'CommandOrControl+Shift+Delete',
  passes: 3,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petSize: 200,
};

export class AppStore {
  private readonly settingsPath: string;
  private readonly logsPath: string;
  private readonly petImagePath: string;

  constructor(app: App) {
    const dataDirectory = app.getPath('userData');
    this.settingsPath = join(dataDirectory, 'settings.json');
    this.logsPath = join(dataDirectory, 'shred-logs.json');
    this.petImagePath = join(dataDirectory, 'custom-pet.png');
  }

  private async readJson<T>(path: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return fallback;
      throw error;
    }
  }

  private async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
  }

  async getSettings(): Promise<AppSettings> {
    const storedSettings = await this.readJson<Partial<AppSettings> & { snapToEdge?: boolean }>(this.settingsPath, {});
    // 清除旧版本遗留的吸附选项，后续保存时不会再写回配置文件。
    delete storedSettings.snapToEdge;
    return { ...DEFAULT_SETTINGS, ...storedSettings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const settings = { ...await this.getSettings(), ...patch };
    await this.writeJson(this.settingsPath, settings);
    return settings;
  }

  async getLogs(): Promise<ShredLog[]> {
    return this.readJson<ShredLog[]>(this.logsPath, []);
  }

  async appendLogs(entries: Omit<ShredLog, 'id' | 'timestamp'>[]): Promise<void> {
    const logs = await this.getLogs();
    const timestamp = new Date().toISOString();
    logs.unshift(...entries.map((entry) => ({ ...entry, id: randomUUID(), timestamp })));
    await this.writeJson(this.logsPath, logs.slice(0, 1000));
  }

  async clearLogs(): Promise<void> {
    await this.writeJson(this.logsPath, []);
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      rm(this.settingsPath, { force: true }),
      rm(this.logsPath, { force: true }),
      rm(this.petImagePath, { force: true }),
    ]);
  }
}
