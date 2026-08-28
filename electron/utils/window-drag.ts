import { BrowserWindow, ipcMain, screen } from 'electron';
import { ElectronDragWindow } from 'electron-drag-window/type';
import { getDraggedPosition } from '@/utils';

export function registerWindowDrag(): () => void {
  const pointerOffsets = new Map<number, Electron.Point>();

  const handleDragStart = (event: Electron.IpcMainEvent): void => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const [windowX, windowY] = window.getPosition();
    pointerOffsets.set(event.sender.id, {
      x: cursor.x - windowX,
      y: cursor.y - windowY,
    });
  };

  const handleDrag = (event: Electron.IpcMainEvent): void => {
    const pointerOffset = pointerOffsets.get(event.sender.id);
    if (!pointerOffset) return;
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
      pointerOffsets.delete(event.sender.id);
      return;
    }
    const position = getDraggedPosition(
      screen.getCursorScreenPoint(),
      pointerOffset,
    );
    const [windowX, windowY] = window.getPosition();
    if (windowX === position.x && windowY === position.y) return;
    // Electron 的屏幕坐标和窗口位置均为 DIP，只移动位置可避免跨 DPI 时缩放窗口。
    window.setPosition(position.x, position.y, false);
  };

  const handleDragOver = (event: Electron.IpcMainEvent): void => {
    pointerOffsets.delete(event.sender.id);
  };

  ipcMain.on(ElectronDragWindow.IpcKey.ELECTRON_DRAG_START, handleDragStart);
  ipcMain.on(ElectronDragWindow.IpcKey.ELECTRON_DRAG_WINDOW, handleDrag);
  ipcMain.on(ElectronDragWindow.IpcKey.ELECTRON_DRAG_OVER, handleDragOver);

  return () => {
    ipcMain.removeListener(
      ElectronDragWindow.IpcKey.ELECTRON_DRAG_START,
      handleDragStart,
    );
    ipcMain.removeListener(
      ElectronDragWindow.IpcKey.ELECTRON_DRAG_WINDOW,
      handleDrag,
    );
    ipcMain.removeListener(
      ElectronDragWindow.IpcKey.ELECTRON_DRAG_OVER,
      handleDragOver,
    );
    pointerOffsets.clear();
  };
}
