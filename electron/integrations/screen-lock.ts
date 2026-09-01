import { win32 } from 'node:path';
import { executeCommand } from '../utils';
// 根据目标平台生成系统锁屏命令。
export function getScreenLockCommand(
  platform: NodeJS.Platform,
): { executable: string; args: readonly string[] } | null {
  if (platform === 'win32') {
    // 读取 Windows 系统目录以定位锁屏程序。
    const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
    return {
      executable: win32.join(systemRoot, 'System32', 'rundll32.exe'),
      args: ['user32.dll,LockWorkStation'],
    };
  }
  if (platform === 'darwin') {
    return {
      executable:
        '/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession',
      args: ['-suspend'],
    };
  }
  if (platform === 'linux') {
    return {
      executable: '/usr/bin/loginctl',
      args: ['lock-session'],
    };
  }
  return null;
}
// 执行当前平台支持的系统锁屏命令。
export async function lockScreen(): Promise<boolean> {
  // 获取当前操作系统对应的锁屏命令。
  const command = getScreenLockCommand(process.platform);
  if (!command) return false;
  // 保存锁屏命令的结构化执行结果。
  const result = await executeCommand(command.executable, command.args);
  if (!result.success)
    throw new Error(result.errors.trim() || '系统屏幕锁定失败');
  return true;
}
