import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  countShredLogPages,
  createLogFilter,
  filterShredLogs,
  paginateShredLogs,
  resolveLogRange,
} from './log';
import { ShredLog, ShredLogFilter } from '@/type';
// 构造一条本地清理记录。
const createLog = (log: Partial<ShredLog>): ShredLog => ({
  id: log.id ?? 'id',
  timestamp: log.timestamp ?? '2026-09-28T06:31:00.000Z',
  path: log.path ?? 'D:/审计资料/年度审计报告.pdf',
  success: log.success ?? true,
  category: log.category ?? 'success',
  message: log.message ?? '粉碎成功',
  ...log,
});
// 构造一份覆盖成功与失败、不同级别与时间范围的记录集合。
const createLogs = (): ShredLog[] => [
  createLog({
    id: 'a',
    path: 'D:/审计资料/年度审计报告.pdf',
    success: true,
    passes: 3,
    timestamp: '2026-09-28T06:31:00.000Z',
  }),
  createLog({
    id: 'b',
    path: 'D:/设计/源文件备份/设计源文件汇编.psd',
    success: false,
    category: 'occupied',
    passes: 7,
    timestamp: '2026-09-28T06:32:00.000Z',
  }),
  createLog({
    id: 'c',
    path: 'E:/归档/资料归档.zip',
    success: true,
    passes: 3,
    timestamp: '2026-09-01T00:05:00.000Z',
  }),
];
// 按条件筛选记录集合。
const applyFilter = (patch: Partial<ShredLogFilter>): ShredLog[] =>
  filterShredLogs(createLogs(), { ...createLogFilter(), ...patch });
// 验证记录筛选的四个维度。
describe('filterShredLogs', () => {
  it('按目标名称模糊搜索路径', () => {
    expect(applyFilter({ keyword: '审计' }).map((log) => log.id)).toEqual([
      'a',
    ]);
  });
  it('按清理结果筛选成功与失败', () => {
    expect(applyFilter({ result: 'success' }).map((log) => log.id)).toEqual([
      'a',
      'c',
    ]);
    expect(applyFilter({ result: 'failure' }).map((log) => log.id)).toEqual([
      'b',
    ]);
  });
  it('按清理级别筛选', () => {
    expect(applyFilter({ passes: 7 }).map((log) => log.id)).toEqual(['b']);
  });
  it('按时间范围筛选并包含边界日期', () => {
    expect(
      applyFilter({ range: ['2026-09-01', '2026-09-30'] }).map((log) => log.id),
    ).toEqual(['a', 'b', 'c']);
    expect(
      applyFilter({ range: ['2026-09-28', '2026-09-28'] }).map((log) => log.id),
    ).toEqual(['a', 'b']);
  });
  it('多个条件同时生效时取交集', () => {
    expect(
      applyFilter({ keyword: '归档', result: 'success', passes: 3 }).map(
        (log) => log.id,
      ),
    ).toEqual(['c']);
  });
  it('条件无命中时返回空列表', () => {
    expect(applyFilter({ keyword: '不存在的目标' })).toEqual([]);
  });
  it('未识别的筛选取值按不限制处理', () => {
    expect(
      filterShredLogs(createLogs(), {
        ...createLogFilter(),
        passes: 9 as never,
        result: 'unknown' as never,
      }).length,
    ).toBe(3);
  });
});
// 验证分页切片与页数计算。
describe('paginateShredLogs', () => {
  // 构造 128 条记录用于分页断言。
  const logs = Array.from({ length: 128 }, (_item, index) =>
    createLog({ id: `log-${index}`, path: `D:/target-${index}.pdf` }),
  );
  it('按每页 50 条切分并返回末页剩余条数', () => {
    expect(paginateShredLogs(logs, 1, 50)).toHaveLength(50);
    expect(paginateShredLogs(logs, 3, 50)).toHaveLength(28);
    expect(countShredLogPages(128, 50)).toBe(3);
  });
  it('越界页码返回空列表', () => {
    expect(paginateShredLogs(logs, 9, 50)).toEqual([]);
  });
  it('总数为零时至少返回一页', () => {
    expect(countShredLogPages(0, 50)).toBe(1);
  });
});
// 验证时间范围预置档位到起止日期的换算。
describe('resolveLogRange', () => {
  it('全部时间不限制范围', () => {
    expect(resolveLogRange('all')).toBeNull();
  });
  it('今天档位的起止日期同为今天', () => {
    const today = dayjs().format('YYYY-MM-DD');
    expect(resolveLogRange('today')).toEqual([today, today]);
  });
  it('近 7 天档位向前回推 6 天', () => {
    expect(resolveLogRange('week')).toEqual([
      dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'),
    ]);
  });
  it('近 30 天档位向前回推 29 天', () => {
    expect(resolveLogRange('month')).toEqual([
      dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
      dayjs().format('YYYY-MM-DD'),
    ]);
  });
});
