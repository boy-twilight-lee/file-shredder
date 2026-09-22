import { describe, expect, it } from 'vitest';
import { parseInstallerConfiguration } from './installer-config';
// 验证安装器命令行配置解析。
describe('parseInstallerConfiguration', () => {
  // 验证普通启动不会被识别为安装阶段。
  it('普通启动返回 null', () => {
    expect(
      parseInstallerConfiguration(['file-shredder.exe', '--background']),
    ).toBeNull();
  });
  // 验证安装器下发的四项系统设置会被完整解析。
  it('解析安装器下发的全部系统设置', () => {
    expect(
      parseInstallerConfiguration([
        'file-shredder.exe',
        '--install-defaults=alwaysOnTop:true,launchAtLogin:false,systemNotifications:true,contextMenuInstalled:true',
      ]),
    ).toEqual({
      alwaysOnTop: true,
      launchAtLogin: false,
      systemNotifications: true,
      contextMenuInstalled: true,
    });
  });
  // 验证开关值同时接受 true/false 与 1/0 两种写法。
  it('接受数字形式的开关值', () => {
    expect(
      parseInstallerConfiguration([
        'file-shredder.exe',
        '--install-defaults=alwaysOnTop:1,contextMenuInstalled:0',
      ]),
    ).toEqual({ alwaysOnTop: true, contextMenuInstalled: false });
  });
  // 验证非系统设置字段与非法取值会被忽略。
  it('忽略非法字段与非法取值', () => {
    expect(
      parseInstallerConfiguration([
        'file-shredder.exe',
        '--install-defaults=passes:35,customPetImagePath:C:\\pet.png,alwaysOnTop:maybe,launchAtLogin:1',
      ]),
    ).toEqual({ launchAtLogin: true });
  });
  // 验证全部字段非法时不会被识别为安装阶段。
  it('没有有效字段时返回 null', () => {
    expect(
      parseInstallerConfiguration([
        'file-shredder.exe',
        '--install-defaults=passes:35,petSize:200',
      ]),
    ).toBeNull();
  });
  // 验证旧版安装器使用的开机启动开关仍然生效。
  it('兼容旧版开机启动开关', () => {
    expect(
      parseInstallerConfiguration(['file-shredder.exe', '--configure-startup=false']),
    ).toEqual({ launchAtLogin: false });
    expect(
      parseInstallerConfiguration(['file-shredder.exe', '--configure-startup=true']),
    ).toEqual({ launchAtLogin: true });
  });
});
