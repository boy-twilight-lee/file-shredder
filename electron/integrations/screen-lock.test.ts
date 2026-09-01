import { describe, expect, it } from 'vitest';
import { getScreenLockCommand } from './screen-lock';
// 验证各操作系统对应的锁屏命令选择。
describe('getScreenLockCommand', () => {
  // 验证 Windows 使用系统原生工作站锁定命令。
  it('uses the native Windows lock workstation command', () => {
    // 获取 Windows 平台锁屏命令。
    const command = getScreenLockCommand('win32');
    expect(command?.executable).toMatch(/\\System32\\rundll32\.exe$/i);
    expect(command?.args).toEqual(['user32.dll,LockWorkStation']);
  });
  // 验证 macOS 使用系统会话挂起命令。
  it('uses the native macOS session suspension command', () => {
    // 获取 macOS 平台锁屏命令。
    const command = getScreenLockCommand('darwin');
    expect(command).toEqual({
      executable:
        '/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession',
      args: ['-suspend'],
    });
  });
  // 验证未支持平台不生成锁屏命令。
  it('returns no command for unsupported systems', () => {
    expect(getScreenLockCommand('aix')).toBeNull();
  });
});
