const fs = require('node:fs');
const path = require('node:path');

/**
 * Keep Windows installer executables and remove other generated release output.
 *
 * @param {string} projectDirectory Project root directory.
 * @returns {string[]} Removed paths.
 */
function cleanReleaseDirectory(projectDirectory) {
  const releaseDirectory = path.resolve(projectDirectory, 'release');
  if (!fs.existsSync(releaseDirectory) || !fs.statSync(releaseDirectory).isDirectory()) {
    return [];
  }

  const removedPaths = [];
  for (const entry of fs.readdirSync(releaseDirectory, { withFileTypes: true })) {
    const entryPath = path.join(releaseDirectory, entry.name);
    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.exe') {
      continue;
    }

    fs.rmSync(entryPath, { recursive: true, force: true, maxRetries: 3 });
    removedPaths.push(entryPath);
  }
  return removedPaths;
}

function main() {
  const projectDirectory = path.resolve(__dirname, '..');
  const removedPaths = cleanReleaseDirectory(projectDirectory);
  console.log(`已清理 release 目录中的 ${removedPaths.length} 个非 EXE 文件或目录。`);
}

if (require.main === module) {
  main();
}

module.exports = { cleanReleaseDirectory };
