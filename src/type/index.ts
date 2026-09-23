export interface ShredProgress {
  path: string;
  completed: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  estimatedSeconds: number;
  stage: 'overwriting' | 'removing' | 'done';
}
export interface ShredResult {
  path: string;
  success: boolean;
  deletedFileCount: number;
  error?: string;
}
export interface ShredSummary {
  succeeded: number;
  failed: number;
  durationMs: number;
  cancelled: boolean;
}
export interface ShredTarget {
  path: string;
  targetType: 'file' | 'directory';
  size: number | null;
}
// 描述粉碎任务在界面导航与状态展示中使用的运行状态。
export type TaskState = 'idle' | 'working' | 'success' | 'failure';
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
export type SettingBooleanKey =
  | 'removeRootDirectory'
  | 'confirmBeforeShred'
  | 'alwaysOnTop'
  | 'launchAtLogin'
  | 'systemNotifications'
  | 'contextMenuInstalled';
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
export interface ShredderApi {
  getPathForFile: (file: File) => string;
  chooseTargets: (kind: 'file' | 'directory') => Promise<string[]>;
  prepareShred: (paths: string[]) => Promise<ShredTarget[]>;
  shred: (paths: string[], passes: 0 | 3 | 7 | 35) => Promise<ShredResult[]>;
  cancelShred: () => Promise<boolean>;
  installContextMenu: () => Promise<boolean>;
  removeContextMenu: () => Promise<boolean>;
  getContextMenuStatus: () => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getLogs: () => Promise<ShredLog[]>;
  deleteLogs: (ids: string[]) => Promise<ShredLog[]>;
  exitApp: () => Promise<boolean>;
  cleanupAndExit: () => Promise<boolean>;
  // 订阅主进程粉碎任务状态变化。
  onTaskState: (callback: (state: TaskState) => void) => () => void;
  // 订阅外部目标触发的粉碎确认请求。
  onTaskConfirm: (
    callback: (targets: ShredTarget[], passes: 0 | 3 | 7 | 35) => void,
  ) => () => void;
  // 订阅当前粉碎任务的实时进度。
  onTaskProgress: (callback: (progress: ShredProgress) => void) => () => void;
  // 订阅当前粉碎任务的最终结果。
  onTaskComplete: (callback: (summary: ShredSummary) => void) => () => void;
  // 订阅其他窗口触发的应用设置变化。
  onSettingsChanged: (callback: () => void) => () => void;
  // 订阅主进程粉碎记录变化。
  onLogsUpdated: (callback: () => void) => () => void;
}
declare global {
  interface Window {
    shredderApi: ShredderApi;
  }
}
