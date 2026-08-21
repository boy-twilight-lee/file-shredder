import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const REGISTRY_ROOT = 'HKCU\\Software\\Classes';
const MENU_PATHS = [
  `${REGISTRY_ROOT}\\*\\shell\\PetFileShredder`,
  `${REGISTRY_ROOT}\\Directory\\shell\\PetFileShredder`,
];

interface CommandResult {
  success: boolean;
  returnCode: number;
  output: string;
  errors: string;
}

function getRegExecutable(): string {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  return `${systemRoot}\\System32\\reg.exe`;
}

async function runReg(args: string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(getRegExecutable(), args, {
      encoding: 'utf8',
      windowsHide: true,
    });
    return {
      success: true,
      returnCode: 0,
      output: result.stdout,
      errors: result.stderr,
    };
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    return {
      success: false,
      returnCode: typeof commandError.code === 'number' ? commandError.code : -1,
      output: commandError.stdout ?? '',
      errors: commandError.stderr ?? commandError.message,
    };
  }
}

async function addValue(keyPath: string, name: string | null, value: string): Promise<boolean> {
  const valueArgs = name === null ? ['/ve'] : ['/v', name];
  const result = await runReg(['add', keyPath, ...valueArgs, '/t', 'REG_SZ', '/d', value, '/f']);
  return result.success;
}

export async function installContextMenu(executablePath: string, iconPath: string): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  const command = `"${executablePath}" --shred "%1"`;
  for (const keyPath of MENU_PATHS) {
    const results = await Promise.all([
      addValue(keyPath, null, '桌宠文件强力粉碎'),
      addValue(keyPath, 'Icon', iconPath),
      addValue(keyPath, 'MultiSelectModel', 'Player'),
      addValue(`${keyPath}\\command`, null, command),
    ]);
    if (results.some((success) => !success)) return false;
  }
  return isContextMenuInstalled(executablePath);
}

export async function isContextMenuInstalled(executablePath: string): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  const expectedCommand = `"${executablePath}" --shred "%1"`;
  for (const keyPath of MENU_PATHS) {
    // 使用 reg.exe 的精确数据匹配，避免解析受 Windows 控制台代码页影响的中文输出。
    const result = await runReg(['query', `${keyPath}\\command`, '/ve', '/f', expectedCommand, '/e']);
    if (!result.success) return false;
  }
  return true;
}

export async function updateContextMenuIcon(iconPath: string): Promise<void> {
  if (process.platform !== 'win32') return;
  for (const keyPath of MENU_PATHS) {
    // 仅刷新已经存在的菜单项，避免图标更新意外创建不完整的右键菜单。
    const queryResult = await runReg(['query', keyPath]);
    if (queryResult.success) await addValue(keyPath, 'Icon', iconPath);
  }
}

export async function removeContextMenu(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  for (const keyPath of MENU_PATHS) {
    const result = await runReg(['delete', keyPath, '/f']);
    // reg.exe 退出码 1 也可能只是键已不存在；查询确认即可保持幂等。
    if (!result.success) {
      const queryResult = await runReg(['query', keyPath]);
      if (queryResult.success) return false;
    }
  }
  return true;
}
