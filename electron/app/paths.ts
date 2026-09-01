import { app } from 'electron';
import { join } from 'node:path';
// 返回系统集成功能应引用的应用可执行文件路径。
export function getExecutablePath(): string {
  // portable 构建运行在临时目录，系统集成必须始终指向外层 EXE。
  return process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe');
}
// 返回当前运行环境中的通用应用图标路径。
export function getIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.png')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.png');
}
// 返回 Windows 系统集成功能使用的 ICO 图标路径。
export function getWindowsIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app-icon.ico')
    : join(app.getAppPath(), 'src', 'assets', 'app-icon.ico');
}
