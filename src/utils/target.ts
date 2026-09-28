import {
  ShredDraftTarget,
  ShredResult,
  ShredResultTargetRow,
  ShredTarget,
  ShredTargetRow,
} from '@/type';
import { formatFileSize, resolveFileDirectory, resolveFileName } from './file';
// 位置缺失时列表展示的占位文案。
const LOCATION_PLACEHOLDER = '—';
// 统一路径分隔符并转为小写，兼容 Windows 盘符与目录分隔符差异。
function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}
// 判断子路径是否位于指定目录之内，用于把逐文件结果归并到顶层目标。
function isPathInsideDirectory(directory: string, target: string): boolean {
  // 统一格式后的目录与目标路径。
  const normalizedDirectory = normalizePath(directory);
  const normalizedTarget = normalizePath(target);
  if (normalizedTarget === normalizedDirectory) return true;
  return normalizedTarget.startsWith(`${normalizedDirectory}/`);
}
// 将主进程返回的目标元数据转换为界面草稿目标。
export function toShredDraftTarget(target: ShredTarget): ShredDraftTarget {
  return {
    path: target.path,
    targetType: target.targetType,
    size: target.size,
  };
}
// 将草稿目标转换为列表行视图模型，统一名称、位置与大小文案。
export function toShredTargetRow(target: ShredDraftTarget): ShredTargetRow {
  return {
    id: target.path,
    path: target.path,
    name: resolveFileName(target.path),
    location: resolveFileDirectory(target.path) || LOCATION_PLACEHOLDER,
    size: formatFileSize(target.size),
    targetType: target.targetType,
  };
}
// 将逐文件结果归并到顶层目标，得到结果页「本次目标」逐行状态。
export function resolveTargetOutcomes(
  targets: ShredDraftTarget[],
  results: ShredResult[],
): ShredResultTargetRow[] {
  return targets.map((target) => {
    // 目录目标按路径包含关系归并，文件目标按路径完全匹配。
    const matched =
      target.targetType === 'directory'
        ? results.filter((result) =>
            isPathInsideDirectory(target.path, result.path),
          )
        : results.filter(
            (result) =>
              normalizePath(result.path) === normalizePath(target.path),
          );
    return {
      id: target.path,
      path: target.path,
      name: resolveFileName(target.path),
      targetType: target.targetType,
      // 没有匹配结果的顶层目标按未清除展示，避免给出无依据的成功结论。
      success: matched.length > 0 && matched.every((result) => result.success),
    };
  });
}
// 合并新目标到既有草稿并按路径去重，保持用户添加顺序。
export function mergeShredTargets(
  current: ShredDraftTarget[],
  incoming: ShredDraftTarget[],
): ShredDraftTarget[] {
  // 汇总既有目标路径用于去重判断。
  const knownPaths = new Set(current.map((target) => target.path));
  // 仅保留尚未加入草稿的新目标。
  const appended = incoming.filter((target) => !knownPaths.has(target.path));
  return appended.length === 0 ? current : [...current, ...appended];
}
// 从草稿中移除指定目标路径。
export function removeShredTargets(
  current: ShredDraftTarget[],
  paths: string[],
): ShredDraftTarget[] {
  if (paths.length === 0) return current;
  // 汇总待移除路径用于筛选。
  const removedPaths = new Set(paths);
  return current.filter((target) => !removedPaths.has(target.path));
}
// 按勾选状态增删选中集合，返回新的选中路径列表。
export function toggleSelectedTarget(
  selectedPaths: string[],
  path: string,
  checked: boolean,
): string[] {
  if (checked)
    return selectedPaths.includes(path)
      ? selectedPaths
      : [...selectedPaths, path];
  return selectedPaths.filter((item) => item !== path);
}
// 从草稿中筛出当前仍可勾选的目标路径，用于清理失效选中项。
export function resolveAvailablePaths(targets: ShredDraftTarget[]): string[] {
  return targets.map((target) => target.path);
}
