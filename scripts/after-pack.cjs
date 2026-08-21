const path = require('node:path');
const rcedit = require('rcedit');

/**
 * Convert an npm semantic version into the four-part numeric version expected by Windows resources.
 *
 * @param {string} version Package version.
 * @returns {string} Windows-compatible file version.
 */
function get_windows_file_version(version) {
  const numeric_parts = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  return [...numeric_parts.slice(0, 4), 0, 0, 0, 0].slice(0, 4).join('.');
}

/**
 * Write the application icon and metadata without electron-builder's winCodeSign archive.
 * This keeps ordinary Windows builds independent of symbolic-link creation privileges.
 *
 * @param {import('electron-builder').AfterPackContext} context electron-builder hook context.
 * @returns {Promise<void>}
 */
module.exports = async function after_pack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const { appInfo } = context.packager;
  const executable_path = path.join(context.appOutDir, `${appInfo.productFilename}.exe`);
  const icon_path = path.join(context.packager.projectDir, 'src', 'assets', 'app-icon.ico');
  const file_version = get_windows_file_version(appInfo.version);

  // electron-builder normally performs this edit through winCodeSign before packaging the portable EXE.
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
