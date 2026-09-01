import { app } from 'electron';
import { join } from 'node:path';
import { getExecutablePath } from './paths';
// 将开机启动设置同步到当前操作系统。
export function applyLoginSetting(enabled: boolean): void {
  if (process.platform === 'win32') {
    // 标识应用当前是否运行在开发环境。
    const isDevelopment = !app.isPackaged;
    // 选择注册到系统启动项的实际可执行文件。
    const path = isDevelopment ? process.execPath : getExecutablePath();
    // 开发态必须传入明确的主进程入口；只启动 electron.exe 会显示默认 Electron 窗口。
    const args = isDevelopment
      ? [join(app.getAppPath(), 'dist-electron', 'main.js'), '--background']
      : ['--background'];
    if (isDevelopment) {
      // 清除历史开发态命令；其中缺少项目入口的版本正是默认 Electron 窗口的来源。
      // 逐项移除曾经写入系统的开发态启动参数。
      for (const legacyArgs of [
        ['--background'],
        [app.getAppPath(), '--background'],
      ])
        app.setLoginItemSettings({
          openAtLogin: false,
          path,
          args: legacyArgs,
        });
    }
    app.setLoginItemSettings({ openAtLogin: enabled, path, args });
    return;
  }
  if (process.platform === 'darwin')
    app.setLoginItemSettings({ openAtLogin: enabled });
}
