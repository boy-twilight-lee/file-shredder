import { win32 } from 'node:path';
import { executeCommand } from '../utils';

export function getScreenLockCommand(
  platform: NodeJS.Platform,
): { executable: string; args: readonly string[] } | null {
  if (platform === 'win32') {
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

export async function lockScreen(): Promise<boolean> {
  const command = getScreenLockCommand(process.platform);
  if (!command) return false;
  const result = await executeCommand(command.executable, command.args);
  if (!result.success)
    throw new Error(result.errors.trim() || '系统屏幕锁定失败');
  return true;
}
