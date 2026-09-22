import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { App } from 'electron';
import { DEFAULT_BUBBLE_ALIGN, DEFAULT_BUBBLE_DIRECTION } from '@/constants';
import { BubbleAlign, BubbleDirection } from '@/type';
import { clamp, normalizeBubbleAlign, normalizeBubbleDirection } from '@/utils';
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
  customPetImagePath: string;
  petImageTemplateId: string;
  uploadedPetImages: UploadedPetImage[];
  petSize: number;
  petDisplayId: number | null;
  petPositionX: number | null;
  petPositionY: number | null;
  bubbleDirection: BubbleDirection;
  bubbleAlign: BubbleAlign;
}
export interface UploadedPetImage {
  id: string;
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
  customPetImagePath: '',
  petImageTemplateId: 'built-in-ao-yin',
  uploadedPetImages: [],
  petSize: 200,
  petDisplayId: null,
  petPositionX: null,
  petPositionY: null,
  // 保持旧版本操作气泡位于人物左侧并垂直居中的展示方式。
  bubbleDirection: DEFAULT_BUBBLE_DIRECTION,
  bubbleAlign: DEFAULT_BUBBLE_ALIGN,
};
// 限制旧版持久化设置恢复时可使用的最小桌宠宽度。
const PET_SIZE_MIN = 50;
// 限制旧版持久化设置恢复时可使用的最大桌宠宽度。
const PET_SIZE_MAX = 400;
export class AppStore {
  // 保存应用设置文件路径。
  private readonly settingsPath: string;
  // 保存粉碎记录文件路径。
  private readonly logsPath: string;
  // 保存旧版本单张自定义桌宠图片路径。
  private readonly petImagePath: string;
  // 保存当前版本的桌宠图片目录路径。
  private readonly petImagesDirectory: string;
  // 根据 Electron 用户数据目录初始化持久化路径。
  constructor(app: App) {
    // 读取当前应用隔离的用户数据目录。
    const dataDirectory = app.getPath('userData');
    this.settingsPath = join(dataDirectory, 'settings.json');
    this.logsPath = join(dataDirectory, 'shred-logs.json');
    this.petImagePath = join(dataDirectory, 'custom-pet.png');
    this.petImagesDirectory = join(dataDirectory, 'imgs');
  }
  // 读取持久化设置并合并当前版本默认值。
  async getSettings(): Promise<AppSettings> {
    // 读取可能包含旧版本字段的设置数据。
    const storedSettings = await readJsonFile<
      Partial<AppSettings> & {
        shortcut?: string;
        snapToEdge?: boolean;
        bubbleAppTitle?: string;
        bubbleAppIconPath?: string;
      }
    >(this.settingsPath, {});
    // 清除旧版本遗留且界面已不再提供的配置，后续保存时不会再写回。
    delete storedSettings.shortcut;
    delete storedSettings.snapToEdge;
    delete storedSettings.bubbleAppTitle;
    delete storedSettings.bubbleAppIconPath;
    // 合并默认设置，并修正旧配置或手工修改产生的无效气泡位置字段。
    const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
    settings.bubbleDirection = normalizeBubbleDirection(
      storedSettings.bubbleDirection,
    );
    settings.bubbleAlign = normalizeBubbleAlign(storedSettings.bubbleAlign);
    // 旧设置缺少该字段或字段无效时保持清理文件夹包含根目录的默认行为。
    settings.removeRootDirectory = storedSettings.removeRootDirectory !== false;
    // 将旧版本或手动修改的桌宠尺寸收敛到当前允许范围。
    settings.petSize = clamp(
      Math.round(
        typeof storedSettings.petSize === 'number'
          ? storedSettings.petSize
          : DEFAULT_SETTINGS.petSize,
      ),
      PET_SIZE_MIN,
      PET_SIZE_MAX,
    );
    return settings;
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
  // 删除应用设置、记录及用户桌宠形象数据。
  async cleanup(): Promise<void> {
    await Promise.all([
      rm(this.settingsPath, { force: true }),
      rm(this.logsPath, { force: true }),
      rm(this.petImagePath, { force: true }),
      rm(this.petImagesDirectory, { force: true, recursive: true }),
    ]);
  }
}
