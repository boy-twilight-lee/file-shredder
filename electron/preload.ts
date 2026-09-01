import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { ShredTarget } from '../src/type';

window.addEventListener('DOMContentLoaded', () => {
  let pendingPointer: { x: number; y: number } | null = null;
  let pointerFrame = 0;
  // Windows 在点击穿透时仍会转发鼠标移动，每帧最多同步一次即可替代主进程常驻轮询。
  window.addEventListener(
    'mousemove',
    (event) => {
      pendingPointer = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;
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

contextBridge.exposeInMainWorld('shredderApi', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  chooseTargets: (kind: 'file' | 'directory') =>
    ipcRenderer.invoke('targets:choose', kind),
  prepareShred: (paths: string[]) => ipcRenderer.invoke('shred:prepare', paths),
  shred: (paths: string[], passes: 0 | 3 | 7 | 35) =>
    ipcRenderer.invoke('shred:start', paths, passes),
  cancelShred: () => ipcRenderer.invoke('shred:cancel'),
  installContextMenu: () => ipcRenderer.invoke('context-menu:install'),
  removeContextMenu: () => ipcRenderer.invoke('context-menu:remove'),
  getContextMenuStatus: () => ipcRenderer.invoke('context-menu:status'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: unknown) =>
    ipcRenderer.invoke('settings:update', settings),
  getPetImage: () => ipcRenderer.invoke('pet-image:get'),
  getPetImageTemplates: () => ipcRenderer.invoke('pet-image:list'),
  choosePetImage: () => ipcRenderer.invoke('pet-image:choose'),
  selectPetImage: (id: string) => ipcRenderer.invoke('pet-image:select', id),
  deletePetImage: (id: string) => ipcRenderer.invoke('pet-image:delete', id),
  getLogs: () => ipcRenderer.invoke('logs:get'),
  deleteLogs: (ids: string[]) => ipcRenderer.invoke('logs:delete', ids),
  lockScreen: () => ipcRenderer.invoke('system:lock-screen'),
  exitApp: () => ipcRenderer.invoke('app:exit'),
  cleanupAndExit: () => ipcRenderer.invoke('app:cleanup-exit'),
  setPetExpanded: (expanded: boolean) =>
    ipcRenderer.send('pet:expanded', expanded),
  setPetImageSize: (width: number, height: number) =>
    ipcRenderer.send('pet:image-size', { width, height }),
  setPetBubbleBounds: (bounds: unknown) =>
    ipcRenderer.send('pet:bubble-bounds', bounds),
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('pet:open-settings', listener);
    return () => ipcRenderer.removeListener('pet:open-settings', listener);
  },
  onPetState: (callback: (state: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: string) =>
      callback(state);
    ipcRenderer.on('pet:state', listener);
    return () => ipcRenderer.removeListener('pet:state', listener);
  },
  onPetConfirm: (
    callback: (targets: ShredTarget[], passes: 0 | 3 | 7 | 35) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      targets: ShredTarget[],
      passes: 0 | 3 | 7 | 35,
    ) => callback(targets, passes);
    ipcRenderer.on('pet:confirm', listener);
    return () => ipcRenderer.removeListener('pet:confirm', listener);
  },
  onPetProgress: (callback: (progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown) =>
      callback(progress);
    ipcRenderer.on('pet:progress', listener);
    return () => ipcRenderer.removeListener('pet:progress', listener);
  },
  onPetComplete: (callback: (summary: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, summary: unknown) =>
      callback(summary);
    ipcRenderer.on('pet:complete', listener);
    return () => ipcRenderer.removeListener('pet:complete', listener);
  },
  onSettingsChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  onLogsUpdated: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('logs:updated', listener);
    return () => ipcRenderer.removeListener('logs:updated', listener);
  },
});
