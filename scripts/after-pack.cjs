// 提供跨平台路径拼接能力。
const path = require('node:path');
// 提供 Windows 可执行文件资源编辑能力。
const rcedit = require('rcedit');
/**
 * 将 npm 语义版本转换为 Windows 资源要求的四段数字版本。
 *
 * @param {string} version 包版本。
 * @returns {string} Windows 兼容的文件版本。
 */
function get_windows_file_version(version) {
  // 将各版本段规范化为非负整数。
  const numeric_parts = version
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  return [...numeric_parts.slice(0, 4), 0, 0, 0, 0].slice(0, 4).join('.');
}
/**
 * 在不依赖 electron-builder winCodeSign 压缩包的情况下写入应用图标与元数据。
 * 使普通 Windows 构建无需创建符号链接的权限。
 *
 * @param {import('electron-builder').AfterPackContext} context electron-builder 钩子上下文。
 * @returns {Promise<void>}
 */
module.exports = async function after_pack(context) {
  if (context.electronPlatformName !== 'win32') return;
  // 提取构建产物使用的应用元数据。
  const { appInfo } = context.packager;
  // 解析需要写入资源的 Windows 可执行文件路径。
  const executable_path = path.join(
    context.appOutDir,
    `${appInfo.productFilename}.exe`,
  );
  // 解析随项目发布的 Windows 图标路径。
  const icon_path = path.join(
    context.packager.projectDir,
    'src',
    'assets',
    'app-icon.ico',
  );
  // 生成 Windows 资源接受的四段文件版本。
  const file_version = get_windows_file_version(appInfo.version);
  // electron-builder 通常在打包便携 EXE 前通过 winCodeSign 完成此资源编辑。
  await rcedit(executable_path, {
    icon: icon_path,
    'file-version': file_version,
    'product-version': file_version,
    'requested-execution-level': 'asInvoker',
    'version-string': {
      CompanyName: appInfo.companyName || appInfo.productName,
      FileDescription: appInfo.description || appInfo.productName,
      InternalName: appInfo.productFilename,
      LegalCopyright: appInfo.copyright,
      OriginalFilename: `${appInfo.productFilename}.exe`,
      ProductName: appInfo.productName,
    },
  });
};
