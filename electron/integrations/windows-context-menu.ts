import { executeCommand } from '../utils';
const REGISTRY_ROOT = 'HKCU\\Software\\Classes';
const MENU_PATHS = [
  `${REGISTRY_ROOT}\\*\\shell\\FileShredder`,
  `${REGISTRY_ROOT}\\Directory\\shell\\FileShredder`,
];
const LEGACY_MENU_PATHS = [
  `${REGISTRY_ROOT}\\*\\shell\\PetFileShredder`,
  `${REGISTRY_ROOT}\\Directory\\shell\\PetFileShredder`,
];

function getRegExecutable(): string {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  return `${systemRoot}\\System32\\reg.exe`;
}

async function addValue(
  keyPath: string,
  name: string | null,
  value: string,
): Promise<boolean> {
  const valueArgs = name === null ? ['/ve'] : ['/v', name];
  const result = await executeCommand(getRegExecutable(), [
    'add',
    keyPath,
    ...valueArgs,
    '/t',
    'REG_SZ',
    '/d',
    value,
    '/f',
  ]);
  return result.success;
}

async function hasRegisteredMenu(
  menuPaths: string[],
  executablePath: string,
): Promise<boolean> {
  const expectedCommand = `"${executablePath}" --shred "%1"`;
  for (const keyPath of menuPaths) {
    // 使用 reg.exe 的精确数据匹配，避免解析受 Windows 控制台代码页影响的中文输出。
    const result = await executeCommand(getRegExecutable(), [
      'query',
      `${keyPath}\\command`,
      '/ve',
      '/f',
      expectedCommand,
      '/e',
    ]);
    if (!result.success) return false;
  }
  return true;
}

async function removeMenuPaths(menuPaths: string[]): Promise<boolean> {
  for (const keyPath of menuPaths) {
    const result = await executeCommand(getRegExecutable(), [
      'delete',
      keyPath,
      '/f',
    ]);
    // reg.exe 退出码 1 也可能只是键已不存在；查询确认即可保持幂等。
    if (!result.success) {
      const queryResult = await executeCommand(getRegExecutable(), [
        'query',
        keyPath,
      ]);
      if (queryResult.success) return false;
    }
  }
  return true;
}

export async function installContextMenu(
  executablePath: string,
  iconPath: string,
): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  const command = `"${executablePath}" --shred "%1"`;
  for (const keyPath of MENU_PATHS) {
    const results = await Promise.all([
      addValue(keyPath, null, '文件粉碎精灵'),
      addValue(keyPath, 'Icon', iconPath),
      addValue(keyPath, 'MultiSelectModel', 'Player'),
      addValue(`${keyPath}\\command`, null, command),
    ]);
    if (results.some((success) => !success)) return false;
  }
  // 新菜单写入成功后再删除旧品牌键，避免升级期间丢失右键菜单。
  if (!(await removeMenuPaths(LEGACY_MENU_PATHS))) return false;
  return isContextMenuInstalled(executablePath);
}

export async function isContextMenuInstalled(
  executablePath: string,
): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  return (
    (await hasRegisteredMenu(MENU_PATHS, executablePath)) ||
    (await hasRegisteredMenu(LEGACY_MENU_PATHS, executablePath))
  );
}

export async function updateContextMenuIcon(iconPath: string): Promise<void> {
  if (process.platform !== 'win32') return;
  for (const keyPath of [...MENU_PATHS, ...LEGACY_MENU_PATHS]) {
    // 仅刷新已经存在的菜单项，避免图标更新意外创建不完整的右键菜单。
    const queryResult = await executeCommand(getRegExecutable(), [
      'query',
      keyPath,
    ]);
    if (queryResult.success) await addValue(keyPath, 'Icon', iconPath);
  }
}

export async function removeContextMenu(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  return removeMenuPaths([...MENU_PATHS, ...LEGACY_MENU_PATHS]);
}
