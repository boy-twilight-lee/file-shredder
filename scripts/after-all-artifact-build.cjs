const fs = require('node:fs/promises');
const path = require('node:path');

/** 判断目标是否严格位于指定目录内。 */
function is_inside(directory, target) {
  const relative_path = path.relative(directory, target);
  return (
    relative_path !== '' &&
    relative_path !== '..' &&
    !relative_path.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative_path)
  );
}

/** 清理输出目录，保留产物及其父目录，不跟随符号链接。 */
async function clean_output(directory, artifact_paths) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entry_path = path.resolve(directory, entry.name);
    if (artifact_paths.includes(entry_path)) continue;
    if (artifact_paths.some((artifact) => is_inside(entry_path, artifact))) {
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        throw new Error(`产物父路径不是普通目录：${entry_path}`);
      }
      await clean_output(entry_path, artifact_paths);
      continue;
    }
    await fs.rm(entry_path, { recursive: true, force: true, maxRetries: 3 });
  }
}

/**
 * 所有平台和架构的产物生成成功后，清理构建中间文件。
 * @param {import('electron-builder').BuildResult} build_result 构建结果。
 * @returns {Promise<string[]>} 不新增发布产物。
 */
module.exports = async function after_all_artifact_build(build_result) {
  // --dir 的解包目录就是最终产物，不能按安装包清单清理。
  const has_directory_target = [
    ...build_result.platformToTargets.values(),
  ].some((targets) => targets.has('dir'));
  if (has_directory_target || build_result.artifactPaths.length === 0)
    return [];

  const project_dir = await fs.realpath(path.resolve(__dirname, '..'));
  const output_dir = path.resolve(build_result.outDir);
  const expected_output = path.join(project_dir, 'release');
  let artifact_paths = build_result.artifactPaths.map((artifact) =>
    path.resolve(artifact),
  );

  // NSIS produces update sidecars and temporary installer outputs that are not
  // part of the distributable requested for this project. Keep the installer
  // executable and remove those files during the final cleanup pass.
  const has_nsis_target = [...build_result.platformToTargets.values()].some(
    (targets) => targets.has('nsis'),
  );
  if (has_nsis_target) {
    artifact_paths = artifact_paths.filter(
      (artifact) => !['.blockmap', '.yml'].includes(path.extname(artifact)),
    );
    await fs.rm(path.join(output_dir, 'latest.yml'), {
      force: true,
      maxRetries: 3,
    });
  }

  try {
    // 仅允许清理本项目真实的 release 目录，拒绝目录链接和自定义外部路径。
    if (
      output_dir !== expected_output ||
      (await fs.realpath(output_dir)) !== expected_output
    ) {
      throw new Error(`清理目录必须是项目内的 release：${output_dir}`);
    }
    // 删除前完整验证产物，避免清单缺失或越界时误删。
    for (const artifact of artifact_paths) {
      if (
        !is_inside(output_dir, artifact) ||
        (await fs.realpath(artifact)) !== artifact
      ) {
        throw new Error(`产物路径不在输出目录内或包含链接：${artifact}`);
      }
      await fs.access(artifact);
    }

    await clean_output(output_dir, artifact_paths);
    for (const entry of await fs.readdir(project_dir, {
      withFileTypes: true,
    })) {
      if (!entry.name.startsWith('dist-') || !entry.isDirectory()) continue;
      const directory = path.resolve(project_dir, entry.name);
      if (
        !is_inside(project_dir, directory) ||
        (await fs.realpath(directory)) !== directory
      ) {
        throw new Error(`构建目录超出项目范围或包含链接：${directory}`);
      }
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 3 });
    }
    console.info('构建清理完成：已删除 dist-* 和 release 中的非产物文件。');
    return [];
  } catch (error) {
    throw new Error('打包产物已生成，但构建目录清理失败。', { cause: error });
  }
};
