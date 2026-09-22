import type { AppSettings } from '../storage';
// 定义安装器可以下发的系统设置字段，其余设置字段一律忽略。
export const INSTALLER_SETTING_KEYS = [
  'alwaysOnTop',
  'launchAtLogin',
  'systemNotifications',
  'contextMenuInstalled',
] as const;
// 描述安装器允许写入的系统设置字段类型。
export type InstallerSettingKey = (typeof INSTALLER_SETTING_KEYS)[number];
// 汇总安装器可下发字段的集合，避免逐次遍历数组。
const INSTALLER_SETTING_KEY_SET: ReadonlySet<string> = new Set(
  INSTALLER_SETTING_KEYS,
);
// 标识安装器下发初始系统设置使用的命令行开关。
const INSTALL_DEFAULTS_FLAG = '--install-defaults=';
// 保留旧版安装器使用的开机启动配置开关。
const STARTUP_FLAG = '--configure-startup=';
// 解析命令行传入的布尔字面量，无法识别时返回 null。
function parseBooleanValue(value: string): boolean | null {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return null;
}
// 解析单个键值对形式的系统设置，字段名或取值非法时返回 null。
function parseSettingPair(pair: string): [InstallerSettingKey, boolean] | null {
  // 拆分字段名与取值，缺少分隔符说明该项无效。
  const separator = pair.indexOf(':');
  if (separator < 0) return null;
  const key = pair.slice(0, separator).trim();
  if (!INSTALLER_SETTING_KEY_SET.has(key)) return null;
  const value = parseBooleanValue(pair.slice(separator + 1).trim());
  if (value === null) return null;
  return [key as InstallerSettingKey, value];
}
// 解析安装器命令行传入的初始系统设置，普通启动返回 null。
export function parseInstallerConfiguration(
  argv: string[],
): Partial<AppSettings> | null {
  // 汇总本次启动命中的安装器设置字段。
  const configuration: Partial<AppSettings> = {};
  for (const argument of argv) {
    // 旧版安装器只同步开机启动设置。
    if (argument.startsWith(STARTUP_FLAG)) {
      const enabled = parseBooleanValue(argument.slice(STARTUP_FLAG.length));
      if (enabled !== null) configuration.launchAtLogin = enabled;
      continue;
    }
    // 当前版本安装器以逗号分隔的键值对一次性下发全部初始设置。
    if (!argument.startsWith(INSTALL_DEFAULTS_FLAG)) continue;
    for (const pair of argument.slice(INSTALL_DEFAULTS_FLAG.length).split(',')) {
      const setting = parseSettingPair(pair);
      if (setting) configuration[setting[0]] = setting[1];
    }
  }
  return Object.keys(configuration).length > 0 ? configuration : null;
}
