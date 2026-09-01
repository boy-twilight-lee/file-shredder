import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { ShredTarget } from '../src/type';
// 页面就绪后按动画帧向主进程同步指针位置。
window.addEventListener('DOMContentLoaded', () => {
  // 保存本帧最近一次鼠标位置。
  let pendingPointer: { x: number; y: number } | null = null;
  // 保存待执行的指针同步动画帧。
  let pointerFrame = 0;
  // Windows 在点击穿透时仍会转发鼠标移动，每帧最多同步一次即可替代主进程常驻轮询。
  window.addEventListener(
    'mousemove',
    // 收集鼠标位置并合并同一帧内的高频移动事件。
    (event) => {
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;
      // 下一动画帧向主进程发送最新指针位置。
      pointerFrame = requestAnimationFrame(() => {
        if (pendingPointer)
          ipcRenderer.send('pet:pointer-move', pendingPointer);
        pendingPointer = null;
        pointerFrame = 0;
      });
    },
    { passive: true },
  );
});
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
  // 读取操作气泡当前使用的自定义应用图标。
  getBubbleAppIcon: () => ipcRenderer.invoke('bubble-app-icon:get'),
  // 选择并保存操作气泡使用的自定义应用图标。
  chooseBubbleAppIcon: () => ipcRenderer.invoke('bubble-app-icon:choose'),
  // 恢复操作气泡使用的默认应用图标。
  resetBubbleAppIcon: () => ipcRenderer.invoke('bubble-app-icon:reset'),
  // 读取当前桌宠形象数据。
  getPetImage: () => ipcRenderer.invoke('pet-image:get'),
  // 读取全部桌宠形象模板。
  getPetImageTemplates: () => ipcRenderer.invoke('pet-image:list'),
  // 选择并保存用户桌宠图片。
  choosePetImage: () => ipcRenderer.invoke('pet-image:choose'),
  // 选择指定桌宠形象模板。
  selectPetImage: (id: string) => ipcRenderer.invoke('pet-image:select', id),
  // 删除指定用户桌宠形象。
  deletePetImage: (id: string) => ipcRenderer.invoke('pet-image:delete', id),
  // 读取全部粉碎记录。
  getLogs: () => ipcRenderer.invoke('logs:get'),
  // 删除指定粉碎记录。
  deleteLogs: (ids: string[]) => ipcRenderer.invoke('logs:delete', ids),
  // 请求系统立即锁屏。
  lockScreen: () => ipcRenderer.invoke('system:lock-screen'),
  // 请求正常退出应用。
  exitApp: () => ipcRenderer.invoke('app:exit'),
  // 请求清理应用数据后退出。
  cleanupAndExit: () => ipcRenderer.invoke('app:cleanup-exit'),
  // 同步桌宠业务气泡展开状态。
  setPetExpanded: (expanded: boolean) =>
    ipcRenderer.send('pet:expanded', expanded),
  // 同步 Chromium 实际解码的桌宠图片尺寸。
  setPetImageSize: (width: number, height: number) =>
    ipcRenderer.send('pet:image-size', { width, height }),
  // 同步业务气泡及传送浮层的联合边界。
  setPetBubbleBounds: (bounds: unknown) =>
    ipcRenderer.send('pet:bubble-bounds', bounds),
  // 订阅主进程打开设置页面的请求。
  onOpenSettings: (callback: () => void) => {
    // 包装业务回调供 Electron 事件订阅与解除使用。
    const listener = () => callback();
    ipcRenderer.on('pet:open-settings', listener);
    // 返回解除设置打开事件监听的清理器。
    return () => ipcRenderer.removeListener('pet:open-settings', listener);
  },
  // 订阅主进程桌宠工作状态变化。
  onPetState: (callback: (state: string) => void) => {
    // 过滤 Electron 事件参数并转发桌宠状态。
    const listener = (_event: Electron.IpcRendererEvent, state: string) =>
      callback(state);
    ipcRenderer.on('pet:state', listener);
    // 返回解除桌宠状态监听的清理器。
    return () => ipcRenderer.removeListener('pet:state', listener);
  },
  // 订阅外部目标触发的粉碎确认请求。
  onPetConfirm: (
    callback: (targets: ShredTarget[], passes: 0 | 3 | 7 | 35) => void,
  ) => {
    // 过滤 Electron 事件参数并转发目标与清理强度。
    const listener = (
      _event: Electron.IpcRendererEvent,
      targets: ShredTarget[],
      passes: 0 | 3 | 7 | 35,
    ) => callback(targets, passes);
    ipcRenderer.on('pet:confirm', listener);
    // 返回解除粉碎确认监听的清理器。
    return () => ipcRenderer.removeListener('pet:confirm', listener);
  },
  // 订阅当前粉碎任务的实时进度。
  onPetProgress: (callback: (progress: unknown) => void) => {
    // 过滤 Electron 事件参数并转发任务进度。
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown) =>
      callback(progress);
    ipcRenderer.on('pet:progress', listener);
    // 返回解除任务进度监听的清理器。
    return () => ipcRenderer.removeListener('pet:progress', listener);
  },
  // 订阅当前粉碎任务的最终结果。
  onPetComplete: (callback: (summary: unknown) => void) => {
    // 过滤 Electron 事件参数并转发任务汇总。
    const listener = (_event: Electron.IpcRendererEvent, summary: unknown) =>
      callback(summary);
    ipcRenderer.on('pet:complete', listener);
    // 返回解除任务完成监听的清理器。
    return () => ipcRenderer.removeListener('pet:complete', listener);
  },
  // 订阅其他窗口触发的应用设置变化。
  onSettingsChanged: (callback: () => void) => {
    // 包装业务回调供 Electron 事件订阅与解除使用。
    const listener = () => callback();
    ipcRenderer.on('settings:changed', listener);
    // 返回解除设置变化监听的清理器。
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  // 订阅主进程粉碎记录变化。
  onLogsUpdated: (callback: () => void) => {
    // 包装业务回调供 Electron 事件订阅与解除使用。
    const listener = () => callback();
    ipcRenderer.on('logs:updated', listener);
    // 返回解除记录变化监听的清理器。
    return () => ipcRenderer.removeListener('logs:updated', listener);
  },
});
