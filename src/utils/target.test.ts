import { describe, expect, it } from 'vitest';
import {
  mergeShredTargets,
  removeShredTargets,
  resolveAvailablePaths,
  resolveTargetOutcomes,
  toShredDraftTarget,
  toShredTargetRow,
  toggleSelectedTarget,
} from './target';
import { ShredDraftTarget, ShredResult } from '@/type';
// 构造一份待清除目标草稿。
const createTargets = (paths: string[]): ShredDraftTarget[] =>
  paths.map((path) => ({
    path,
    targetType: 'file',
    size: 1024,
  }));
// 验证目标元数据到草稿目标的转换。
describe('toShredDraftTarget', () => {
  it('保留路径、类型与大小', () => {
    expect(
      toShredDraftTarget({ path: 'D:/a.pdf', targetType: 'file', size: 2048 }),
    ).toEqual({ path: 'D:/a.pdf', targetType: 'file', size: 2048 });
  });
});
// 验证草稿合并去重。
describe('mergeShredTargets', () => {
  it('追加新目标并保持顺序', () => {
    const merged = mergeShredTargets(
      createTargets(['D:/a.pdf']),
      createTargets(['D:/b.pdf', 'D:/c.pdf']),
    );
    expect(merged.map((target) => target.path)).toEqual([
      'D:/a.pdf',
      'D:/b.pdf',
      'D:/c.pdf',
    ]);
  });
  it('重复路径被去重且总数不变', () => {
    const current = createTargets(['D:/a.pdf', 'D:/b.pdf']);
    const merged = mergeShredTargets(current, createTargets(['D:/a.pdf']));
    expect(merged).toHaveLength(2);
  });
  it('无新增目标时保持原引用', () => {
    const current = createTargets(['D:/a.pdf']);
    expect(mergeShredTargets(current, [])).toBe(current);
  });
});
// 验证草稿删除。
describe('removeShredTargets', () => {
  it('移除指定路径并保留其余目标', () => {
    const targets = createTargets(['D:/a.pdf', 'D:/b.pdf', 'D:/c.pdf']);
    const removed = removeShredTargets(targets, ['D:/b.pdf']);
    expect(removed.map((target) => target.path)).toEqual([
      'D:/a.pdf',
      'D:/c.pdf',
    ]);
  });
  it('全部移除后返回空列表', () => {
    const targets = createTargets(['D:/a.pdf', 'D:/b.pdf']);
    expect(removeShredTargets(targets, resolveAvailablePaths(targets))).toEqual(
      [],
    );
  });
  it('未指定路径时保持原引用', () => {
    const targets = createTargets(['D:/a.pdf']);
    expect(removeShredTargets(targets, [])).toBe(targets);
  });
});
// 验证勾选集合的增删。
describe('toggleSelectedTarget', () => {
  it('勾选时追加且不产生重复项', () => {
    expect(toggleSelectedTarget(['D:/a.pdf'], 'D:/b.pdf', true)).toEqual([
      'D:/a.pdf',
      'D:/b.pdf',
    ]);
    expect(toggleSelectedTarget(['D:/a.pdf'], 'D:/a.pdf', true)).toEqual([
      'D:/a.pdf',
    ]);
  });
  it('取消勾选时移除该项', () => {
    expect(
      toggleSelectedTarget(['D:/a.pdf', 'D:/b.pdf'], 'D:/a.pdf', false),
    ).toEqual(['D:/b.pdf']);
  });
});
// 构造仅关注路径与成功状态的底层结果。
const createResults = (
  results: Array<{ path: string; success: boolean }>,
): ShredResult[] =>
  results.map((result) => ({
    path: result.path,
    success: result.success,
    deletedFileCount: result.success ? 1 : 0,
  }));
// 验证草稿目标到表格行的转换。
describe('toShredTargetRow', () => {
  it('拆出名称、位置与可读大小', () => {
    expect(
      toShredTargetRow({
        path: 'D:/审计资料/年度审计报告.pdf',
        targetType: 'file',
        size: 4404019,
      }),
    ).toEqual({
      id: 'D:/审计资料/年度审计报告.pdf',
      path: 'D:/审计资料/年度审计报告.pdf',
      name: '年度审计报告.pdf',
      location: 'D:/审计资料',
      size: '4.2 MB',
      targetType: 'file',
    });
  });
  it('位置缺失时使用占位文案', () => {
    expect(
      toShredTargetRow({ path: 'report.pdf', targetType: 'file', size: null })
        .location,
    ).toBe('—');
  });
});
// 验证逐文件结果到顶层目标状态的归并。
describe('resolveTargetOutcomes', () => {
  it('文件目标按路径完全匹配归并', () => {
    const outcomes = resolveTargetOutcomes(createTargets(['D:/a.pdf']), [
      { path: 'D:/a.pdf', success: true, deletedFileCount: 1 },
    ]);
    expect(outcomes[0].success).toBe(true);
  });
  it('目录目标按路径包含关系归并子文件结果', () => {
    const outcomes = resolveTargetOutcomes(
      [
        {
          path: 'D:/cache',
          targetType: 'directory',
          size: null,
        },
      ],
      createResults([
        { path: 'D:\\cache\\a.tmp', success: true },
        { path: 'D:/cache/b.tmp', success: true },
      ]),
    );
    expect(outcomes[0].success).toBe(true);
    expect(outcomes[0].name).toBe('cache');
  });
  it('目录中任一子文件失败即视为未清除', () => {
    const outcomes = resolveTargetOutcomes(
      [{ path: 'D:/cache', targetType: 'directory', size: null }],
      createResults([
        { path: 'D:/cache/a.tmp', success: true },
        { path: 'D:/cache/b.tmp', success: false },
      ]),
    );
    expect(outcomes[0].success).toBe(false);
  });
  it('没有匹配结果的目标准量为未清除', () => {
    const outcomes = resolveTargetOutcomes(createTargets(['D:/a.pdf']), []);
    expect(outcomes[0].success).toBe(false);
  });
});
