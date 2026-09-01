import { executeCommand } from '../utils';
// 标识当前用户级文件类型注册表根路径。
const REGISTRY_ROOT = 'HKCU\\Software\\Classes';
// 定义当前品牌使用的文件与文件夹右键菜单键。
const MENU_PATHS = [
  `${REGISTRY_ROOT}\\*\\shell\\FileShredder`,
  `${REGISTRY_ROOT}\\Directory\\shell\\FileShredder`,
];
// 定义升级时需要兼容和清理的旧品牌菜单键。
const LEGACY_MENU_PATHS = [
  `${REGISTRY_ROOT}\\*\\shell\\PetFileShredder`,
  `${REGISTRY_ROOT}\\Directory\\shell\\PetFileShredder`,
];
// 返回 Windows 注册表命令行程序的绝对路径。
function getRegExecutable(): string {
  // 读取 Windows 系统目录以定位注册表工具。
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows';
  return `${systemRoot}\\System32\\reg.exe`;
}
// 向指定注册表键写入字符串值。
async function addValue(
  keyPath: string,
  name: string | null,
  value: string,
): Promise<boolean> {
  // 根据默认值或命名值生成对应的 reg.exe 参数。
  const valueArgs = name === null ? ['/ve'] : ['/v', name];
  // 保存注册表写入命令的执行结果。
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
// 验证一组菜单键是否指向当前应用命令。
async function hasRegisteredMenu(
  menuPaths: string[],
  executablePath: string,
): Promise<boolean> {
  // 生成注册表中应保存的完整粉碎命令。
  const expectedCommand = `"${executablePath}" --shred "%1"`;
  // 逐个验证文件与文件夹菜单键。
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
// 幂等删除指定的右键菜单键集合。
async function removeMenuPaths(menuPaths: string[]): Promise<boolean> {
  // 逐个删除并验证每个菜单键。
  for (const keyPath of menuPaths) {
    // 保存当前菜单键删除命令的执行结果。
    const result = await executeCommand(getRegExecutable(), [
      'delete',
      keyPath,
      '/f',
    ]);
    // reg.exe 退出码 1 也可能只是键已不存在；查询确认即可保持幂等。
    if (!result.success) {
      // 查询删除失败后菜单键是否仍然存在。
      const queryResult = await executeCommand(getRegExecutable(), [
        'query',
        keyPath,
      ]);
      if (queryResult.success) return false;
    }
  }
  return true;
}
// 为文件与文件夹安装文件粉碎右键菜单。
export async function installContextMenu(
  executablePath: string,
  iconPath: string,
): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  // 生成右键菜单最终执行的应用命令。
  const command = `"${executablePath}" --shred "%1"`;
  // 分别写入文件和文件夹的菜单配置。
  for (const keyPath of MENU_PATHS) {
    // 并行写入当前菜单键所需的全部注册表值。
    const results = await Promise.all([
      addValue(keyPath, null, '文件粉碎精灵'),
      addValue(keyPath, 'Icon', iconPath),
      addValue(keyPath, 'MultiSelectModel', 'Player'),
      addValue(`${keyPath}\\command`, null, command),
    ]);
    // 任一注册表值写入失败都视为菜单安装失败。
    if (results.some((success) => !success)) return false;
  }
  // 新菜单写入成功后再删除旧品牌键，避免升级期间丢失右键菜单。
  if (!(await removeMenuPaths(LEGACY_MENU_PATHS))) return false;
  return isContextMenuInstalled(executablePath);
}
// 判断当前应用右键菜单是否已经完整安装。
export async function isContextMenuInstalled(
  executablePath: string,
): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  return (
    (await hasRegisteredMenu(MENU_PATHS, executablePath)) ||
    (await hasRegisteredMenu(LEGACY_MENU_PATHS, executablePath))
  );
}
// 更新现有右键菜单使用的应用图标。
export async function updateContextMenuIcon(iconPath: string): Promise<void> {
  if (process.platform !== 'win32') return;
  // 同时兼容刷新当前与旧品牌菜单键。
  for (const keyPath of [...MENU_PATHS, ...LEGACY_MENU_PATHS]) {
    // 仅刷新已经存在的菜单项，避免图标更新意外创建不完整的右键菜单。
    // 查询菜单键是否已经存在。
    const queryResult = await executeCommand(getRegExecutable(), [
      'query',
      keyPath,
    ]);
    if (queryResult.success) await addValue(keyPath, 'Icon', iconPath);
  }
}
// 删除当前与旧品牌注册的全部右键菜单。
export async function removeContextMenu(): Promise<boolean> {
  if (process.platform !== 'win32') return false;
  return removeMenuPaths([...MENU_PATHS, ...LEGACY_MENU_PATHS]);
}
