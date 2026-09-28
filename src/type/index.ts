// 定义文件清理任务支持的覆写强度。
export type ShredPasses = 0 | 3 | 7 | 35;
// 定义主进程实际推送的处理阶段。
export type ShredStage = 'overwriting' | 'removing' | 'done';
// 定义渲染进程可切换的页面标识。
export type PageKey = 'shred' | 'records' | 'settings' | 'about';
// 定义清理任务的四个步骤。
export type ShredStep = 'select' | 'confirm' | 'progress' | 'result';
// 定义进度页处理明细中的单行状态。
export type ShredDetailStatus = 'working' | 'done';
// 定义进度页处理明细的单行数据。
export interface ShredDetailRow {
  id: string;
  path: string;
  time: string;
  stage: ShredStage;
  status: ShredDetailStatus;
}
// 定义结果页使用的三态语义。
export type ShredResultTone = 'success' | 'warning' | 'error';
// 定义结果三态对应的语义色组合。
export interface ShredResultToneStyle {
  text: string;
  background: string;
  deep: string;
  gradient: string;
}
// 定义结果页三态展示所需的文案与插画。
export interface ShredResultContent {
  badge: string;
  title: string;
  description: string;
  illustration: string;
}
// 定义记录筛选的清理结果维度取值。
export type ShredLogFilterResult = 'all' | 'success' | 'failure';
// 定义记录筛选的时间范围预置档位。
export type ShredLogRangePreset = 'all' | 'today' | 'week' | 'month';
// 定义记录页的筛选条件。
export interface ShredLogFilter {
  keyword: string;
  result: ShredLogFilterResult;
  passes: ShredPasses | 'all';
  range: [string, string] | null;
}
// 定义待清除目标在界面上的草稿形态。
export interface ShredDraftTarget {
  path: string;
  targetType: 'file' | 'directory';
  size: number | null;
}
// 定义待清除目标在列表与表格中展示的行视图模型。
export interface ShredTargetRow {
  id: string;
  path: string;
  name: string;
  location: string;
  size: string;
  targetType: 'file' | 'directory';
}
// 定义结果页「本次目标」行汇总的最终处理状态。
export interface ShredResultTargetRow {
  id: string;
  path: string;
  name: string;
  targetType: 'file' | 'directory';
  success: boolean;
}
// 定义进度页文件处理队列的单段状态。
export interface ShredQueueSegment {
  state: 'completed' | 'working' | 'pending';
  color: string;
}
export interface ShredProgress {
  path: string;
  completed: number;
  total: number;
  fileIndex: number;
  fileCount: number;
  estimatedSeconds: number;
  stage: ShredStage;
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
  passes: ShredPasses;
  removeRootDirectory: boolean;
  confirmBeforeShred: boolean;
  alwaysOnTop: boolean;
  // 控制下次启动时是否恢复上次退出时的窗口位置与尺寸。
  rememberWindowPosition: boolean;
  launchAtLogin: boolean;
  systemNotifications: boolean;
  contextMenuInstalled: boolean;
  contextMenuAutoInstall: boolean;
}
export type SettingBooleanKey =
  | 'removeRootDirectory'
  | 'confirmBeforeShred'
  | 'alwaysOnTop'
  | 'rememberWindowPosition'
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
  // 记录本次任务使用的覆写强度，供记录页按清理级别筛选。
  passes?: ShredPasses;
  // 记录本次任务的总耗时，供详情抽屉展示消耗时间。
  durationMs?: number;
}
export interface ShredderApi {
  getPathForFile: (file: File) => string;
  chooseTargets: (kind: 'file' | 'directory') => Promise<string[]>;
  prepareShred: (paths: string[]) => Promise<ShredTarget[]>;
  shred: (paths: string[], passes: ShredPasses) => Promise<ShredResult[]>;
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
  // 使用系统默认浏览器打开外部链接。
  openExternal: (url: string) => Promise<boolean>;
  // 最小化主窗口。
  minimizeWindow: () => Promise<void>;
  // 切换主窗口最大化与还原状态。
  toggleMaximizeWindow: () => Promise<boolean>;
  // 关闭主窗口。
  closeWindow: () => Promise<void>;
  // 查询主窗口当前是否处于最大化状态。
  isWindowMaximized: () => Promise<boolean>;
  // 订阅主窗口最大化状态变化。
  onWindowMaximized: (callback: (maximized: boolean) => void) => () => void;
  // 订阅主进程粉碎任务状态变化。
  onTaskState: (callback: (state: TaskState) => void) => () => void;
  // 订阅外部目标触发的粉碎确认请求。
  onTaskConfirm: (
    callback: (targets: ShredTarget[], passes: ShredPasses) => void,
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
