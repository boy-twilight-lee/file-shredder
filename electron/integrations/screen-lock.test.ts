import { describe, expect, it } from 'vitest';
import { getScreenLockCommand } from './screen-lock';

describe('getScreenLockCommand', () => {
  it('uses the native Windows lock workstation command', () => {
    const command = getScreenLockCommand('win32');
    expect(command?.executable).toMatch(/\\System32\\rundll32\.exe$/i);
    expect(command?.args).toEqual(['user32.dll,LockWorkStation']);
  });

  it('uses the native macOS session suspension command', () => {
    const command = getScreenLockCommand('darwin');
    expect(command).toEqual({
      executable:
        '/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession',
      args: ['-suspend'],
    });
  });

  it('returns no command for unsupported systems', () => {
    expect(getScreenLockCommand('aix')).toBeNull();
  });
});
