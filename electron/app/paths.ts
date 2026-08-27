import { app } from 'electron';
import { join } from 'node:path';

export function getExecutablePath(): string {
  // portable 构建运行在临时目录，系统集成必须始终指向外层 EXE。
  return process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
}

export function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.png')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.png');
}

export function getWindowsIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.ico')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.ico');
}
