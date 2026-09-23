import { contextBridge, ipcRenderer, webUtils } from 'electron';
import {
  ShredProgress,
  ShredSummary,
  ShredTarget,
  TaskState,
} from '../src/type';
// 创建过滤 Electron 事件参数的事件订阅器，并返回解除订阅的清理函数。
function subscribe<Args extends unknown[]>(
  channel: string,
  callback: (...args: Args) => void,
): () => void {
  // 包装业务回调供 Electron 事件订阅与解除使用。
  const listener = (_event: Electron.IpcRendererEvent, ...args: Args) =>
    callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
// 向受隔离的渲染进程暴露类型受控的主进程能力。
contextBridge.exposeInMainWorld('shredderApi', {
  // 返回拖放文件对应的本地路径。
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  // 打开目标选择器并返回本地路径。
  chooseTargets: (kind: 'file' | 'directory') =>
    ipcRenderer.invoke('targets:choose', kind),
  // 校验候选路径并读取粉碎目标元数据。
  prepareShred: (paths: string[]) => ipcRenderer.invoke('shred:prepare', paths),
  // 启动指定清理强度的粉碎任务。
  shred: (paths: string[], passes: 0 | 3 | 7 | 35) =>
    ipcRenderer.invoke('shred:start', paths, passes),
  // 请求取消当前粉碎任务。
  cancelShred: () => ipcRenderer.invoke('shred:cancel'),
  // 安装资源管理器右键菜单。
  installContextMenu: () => ipcRenderer.invoke('context-menu:install'),
  // 删除资源管理器右键菜单。
  removeContextMenu: () => ipcRenderer.invoke('context-menu:remove'),
  // 查询资源管理器右键菜单状态。
  getContextMenuStatus: () => ipcRenderer.invoke('context-menu:status'),
  // 读取当前应用设置。
  getSettings: () => ipcRenderer.invoke('settings:get'),
  // 保存部分应用设置。
  updateSettings: (settings: unknown) =>
    ipcRenderer.invoke('settings:update', settings),
  // 读取全部粉碎记录。
  getLogs: () => ipcRenderer.invoke('logs:get'),
  // 删除指定粉碎记录。
  deleteLogs: (ids: string[]) => ipcRenderer.invoke('logs:delete', ids),
  // 请求正常退出应用。
  exitApp: () => ipcRenderer.invoke('app:exit'),
  // 请求清理应用数据后退出。
  cleanupAndExit: () => ipcRenderer.invoke('app:cleanup-exit'),
  // 订阅主进程粉碎任务状态变化。
  onTaskState: (callback: (state: TaskState) => void) =>
    subscribe<[TaskState]>('task:state', callback),
  // 订阅外部目标触发的粉碎确认请求。
  onTaskConfirm: (
    callback: (targets: ShredTarget[], passes: 0 | 3 | 7 | 35) => void,
  ) => subscribe<[ShredTarget[], 0 | 3 | 7 | 35]>('task:confirm', callback),
  // 订阅当前粉碎任务的实时进度。
  onTaskProgress: (callback: (progress: ShredProgress) => void) =>
    subscribe<[ShredProgress]>('task:progress', callback),
  // 订阅当前粉碎任务的最终结果。
  onTaskComplete: (callback: (summary: ShredSummary) => void) =>
    subscribe<[ShredSummary]>('task:complete', callback),
  // 订阅其他窗口触发的应用设置变化。
  onSettingsChanged: (callback: () => void) =>
    subscribe<[]>('settings:changed', callback),
  // 订阅主进程粉碎记录变化。
  onLogsUpdated: (callback: () => void) =>
    subscribe<[]>('logs:updated', callback),
});
