import { describe, expect, it } from 'vitest';
import {
  SHRED_PASSES_OPTIONS,
  SHRED_RESULT_TONES,
  SHRED_STAGES,
} from '@/constants';
import {
  isShredPasses,
  resolveBytePercent,
  resolveFilePercent,
  resolveFileProgressLabel,
  resolveOverwriteLabel,
  resolvePassesLabel,
  resolveQueueSegments,
  resolveResultTone,
  resolveStageIndex,
  resolveStageLabel,
} from './shred';
import { ShredProgress, ShredSummary } from '@/type';
// 构造仅关注结果计数的任务汇总。
const createSummary = (summary: Partial<ShredSummary>): ShredSummary => ({
  succeeded: 0,
  failed: 0,
  durationMs: 0,
  cancelled: false,
  ...summary,
});
// 构造仅关注进度的任务快照。
const createProgress = (progress: Partial<ShredProgress>): ShredProgress => ({
  path: '',
  completed: 0,
  total: 0,
  fileIndex: 0,
  fileCount: 0,
  estimatedSeconds: 0,
  stage: 'overwriting',
  ...progress,
});
// 验证清理级别文案与选项集合。
describe('清理级别', () => {
  it('返回级别对应文案', () => {
    expect(resolvePassesLabel(0)).toBe('极速 · 0 遍');
    expect(resolvePassesLabel(3)).toBe('日常 · 3 遍');
    expect(resolvePassesLabel(7)).toBe('加强 · 7 遍');
    expect(resolvePassesLabel(35)).toBe('深度 · 35 遍');
  });
  it('选项集合固定为四项且顺序不变', () => {
    expect(SHRED_PASSES_OPTIONS.map((option) => option.value)).toEqual([
      0, 3, 7, 35,
    ]);
  });
  it('仅接受受支持的级别取值', () => {
    expect(isShredPasses(7)).toBe(true);
    expect(isShredPasses(1)).toBe(false);
    expect(isShredPasses('7')).toBe(false);
  });
});
// 验证处理阶段集合与文案。
describe('处理阶段', () => {
  it('阶段集合恰好包含覆写、销毁与完成三项', () => {
    expect(SHRED_STAGES).toEqual(['overwriting', 'removing', 'done']);
  });
  it('返回阶段文案与下标', () => {
    expect(resolveStageLabel('overwriting')).toBe('覆写数据');
    expect(resolveStageLabel('removing')).toBe('销毁文件项');
    expect(resolveStageLabel('done')).toBe('目标完成');
    expect(resolveStageIndex('overwriting')).toBe(0);
    expect(resolveStageIndex('removing')).toBe(1);
    expect(resolveStageIndex('done')).toBe(2);
    expect(resolveStageIndex(undefined)).toBe(-1);
  });
});
// 验证结果三态语义色。
describe('结果三态语义色', () => {
  it('三态取值与设计规范一致', () => {
    expect(SHRED_RESULT_TONES.success).toMatchObject({
      text: '#26a555',
      background: '#e9f6ee',
      deep: '#1b743c',
    });
    expect(SHRED_RESULT_TONES.warning).toMatchObject({
      text: '#ff7d00',
      background: '#fff4e5',
      deep: '#9e5200',
    });
    expect(SHRED_RESULT_TONES.error).toMatchObject({
      text: '#ff4c26',
      background: '#fff1ee',
      deep: '#b3351b',
    });
  });
});
// 验证结果三态判定规则。
describe('resolveResultTone', () => {
  it('全部成功判定为成功态', () => {
    expect(resolveResultTone(createSummary({ succeeded: 5 }))).toBe('success');
  });
  it('部分失败判定为警示态', () => {
    expect(resolveResultTone(createSummary({ succeeded: 4, failed: 1 }))).toBe(
      'warning',
    );
  });
  it('全部失败判定为失败态', () => {
    expect(resolveResultTone(createSummary({ failed: 5 }))).toBe('error');
  });
  it('取消的任务归入警示态', () => {
    expect(
      resolveResultTone(createSummary({ succeeded: 3, cancelled: true })),
    ).toBe('warning');
  });
  it('空任务不崩溃并归入警示态', () => {
    expect(resolveResultTone(createSummary({}))).toBe('warning');
  });
});
// 验证进度派生量。
describe('进度派生量', () => {
  it('按文件数计算环形进度与文案', () => {
    expect(
      resolveFilePercent(createProgress({ fileIndex: 3, fileCount: 5 })),
    ).toBe(60);
    expect(
      resolveFileProgressLabel(createProgress({ fileIndex: 3, fileCount: 5 })),
    ).toBe('已完成 3 / 5 个文件');
  });
  it('文件数为零时返回 0 且不出现除零', () => {
    expect(resolveFilePercent(createProgress({}))).toBe(0);
    expect(resolveFilePercent(null)).toBe(0);
    expect(resolveFileProgressLabel(null)).toBe('等待开始');
  });
  it('按字节计算字节级进度', () => {
    expect(
      resolveBytePercent(createProgress({ completed: 64, total: 100 })),
    ).toBe(64);
    expect(resolveBytePercent(createProgress({ total: 0 }))).toBe(0);
  });
  it('进度异常超出范围时收敛到边界', () => {
    expect(
      resolveFilePercent(createProgress({ fileIndex: 9, fileCount: 5 })),
    ).toBe(100);
    expect(
      resolveBytePercent(createProgress({ completed: -3, total: 100 })),
    ).toBe(0);
  });
});
// 验证文件处理队列分段。
describe('resolveQueueSegments', () => {
  it('按已完成、处理中、待处理生成分段色', () => {
    const segments = resolveQueueSegments(3, 5);
    expect(segments.map((segment) => segment.state)).toEqual([
      'completed',
      'completed',
      'completed',
      'working',
      'pending',
    ]);
    expect(segments.map((segment) => segment.color)).toEqual([
      '#26a555',
      '#26a555',
      '#26a555',
      '#0065ff',
      '#e1e5eb',
    ]);
  });
  it('未开始时无处理中分段，全部完成时无待处理分段', () => {
    expect(resolveQueueSegments(0, 3).map((segment) => segment.state)).toEqual([
      'working',
      'pending',
      'pending',
    ]);
    expect(resolveQueueSegments(3, 3).map((segment) => segment.state)).toEqual([
      'completed',
      'completed',
      'completed',
    ]);
  });
  it('文件数为零时返回空队列', () => {
    expect(resolveQueueSegments(0, 0)).toEqual([]);
  });
});
// 验证结果页数据覆写文案。
describe('resolveOverwriteLabel', () => {
  it('极速级别提示跳过覆写', () => {
    expect(resolveOverwriteLabel(0)).toBe('跳过覆写，直接删除');
  });
  it('其余级别按遍数生成文案', () => {
    expect(resolveOverwriteLabel(3)).toBe('随机数据覆写 3 遍');
    expect(resolveOverwriteLabel(35)).toBe('随机数据覆写 35 遍');
  });
});
