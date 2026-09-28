import {
  ShredLogFilterResult,
  ShredLogRangePreset,
  ShredPasses,
  ShredResultContent,
  ShredResultTone,
  ShredResultToneStyle,
  ShredStage,
  ShredStep,
} from '@/type';
// 清理任务的四个步骤，顺序即步骤条展示顺序。
export const SHRED_STEPS: Array<{ key: ShredStep; label: string }> = [
  { key: 'select', label: '拖拽文件' },
  { key: 'confirm', label: '清除列表确认' },
  { key: 'progress', label: '清除进度' },
  { key: 'result', label: '清除结果' },
];
// 结果三态使用的语义色，取值来自 docs/design-token.md。
export const SHRED_RESULT_TONES: Record<ShredResultTone, ShredResultToneStyle> =
  {
    success: {
      text: '#26a555',
      background: '#e9f6ee',
      deep: '#1b743c',
      gradient: 'linear-gradient(180deg, #f2fbf6 0%, #ffffff 100%)',
    },
    warning: {
      text: '#ff7d00',
      background: '#fff4e5',
      deep: '#9e5200',
      gradient: 'linear-gradient(180deg, #fff6e8 0%, #ffffff 100%)',
    },
    error: {
      text: '#ff4c26',
      background: '#fff1ee',
      deep: '#b3351b',
      gradient: 'linear-gradient(180deg, #fff4f1 0%, #ffffff 100%)',
    },
  };
// 结果页三态展示的插画与文案。
export const SHRED_RESULT_CONTENTS: Record<
  ShredResultTone,
  ShredResultContent
> = {
  success: {
    badge: '清理成功',
    title: '清理完成',
    description: '目标已按清理级别覆写并销毁，原始数据无法再被还原。',
    illustration: 'illustration-success',
  },
  warning: {
    badge: '部分成功',
    title: '部分完成',
    description: '仍有目标未清理，通常是文件被其他程序占用，可关闭后重试。',
    illustration: 'illustration-warning',
  },
  error: {
    badge: '清理失败',
    title: '清理失败',
    description: '目标均未清理成功，请确认未被占用且当前账户权限充足。',
    illustration: 'illustration-failure',
  },
};
// 任务被用户取消时覆盖展示的结果文案。
export const SHRED_CANCELLED_CONTENT: ShredResultContent = {
  badge: '已取消',
  title: '已取消清理',
  description: '已处理的目标无法恢复，未处理的目标仍保留在原位置。',
  illustration: 'illustration-warning',
};
// 清理级别的可选集合，顺序与设计稿分段按钮组一致。
export const SHRED_PASSES_OPTIONS: Array<{
  label: string;
  value: ShredPasses;
  description: string;
}> = [
  { label: '极速', value: 0, description: '直接删除，不覆写数据' },
  { label: '日常', value: 3, description: '覆写 3 遍，兼顾速度与安全' },
  { label: '加强', value: 7, description: '覆写 7 遍，适合敏感资料' },
  { label: '深度', value: 35, description: '覆写 35 遍，耗时最长' },
];
// 清理级别对应的一句话文案，用于设置项说明与结果详情。
export const SHRED_PASSES_LABELS: Record<ShredPasses, string> = {
  0: '极速 · 0 遍',
  3: '日常 · 3 遍',
  7: '加强 · 7 遍',
  35: '深度 · 35 遍',
};
// 主进程实际推送的处理阶段，顺序即界面展示顺序。
export const SHRED_STAGES: ShredStage[] = ['overwriting', 'removing', 'done'];
// 处理阶段对应的用户视角文案。
export const SHRED_STAGE_LABELS: Record<ShredStage, string> = {
  overwriting: '覆写数据',
  removing: '销毁文件项',
  done: '目标完成',
};
// 处理阶段对应的规则说明，用于进度页阶段说明卡。
export const SHRED_STAGE_DESCRIPTIONS: Record<ShredStage, string> = {
  overwriting: '按清理级别写入随机数据并落盘，使原始内容无法还原',
  removing: '覆写完成后删除文件项本身，并回收目录结构',
  done: '全部目标处理完毕，结果写入本地清理记录',
};
// 记录筛选的清理结果选项，值为空表示不限制。
export const SHRED_RESULT_FILTER_OPTIONS: Array<{
  label: string;
  value: ShredLogFilterResult;
}> = [
  { label: '全部结果', value: 'all' },
  { label: '清理成功', value: 'success' },
  { label: '清理失败', value: 'failure' },
];
// 记录筛选的清理级别选项，值为空表示不限制。
export const SHRED_PASSES_FILTER_OPTIONS: Array<{
  label: string;
  value: ShredPasses | 'all';
}> = [
  { label: '全部级别', value: 'all' },
  { label: '极速', value: 0 },
  { label: '日常', value: 3 },
  { label: '加强', value: 7 },
  { label: '深度', value: 35 },
];
// 记录筛选的时间范围预置选项。
export const SHRED_RANGE_FILTER_OPTIONS: Array<{
  label: string;
  value: ShredLogRangePreset;
}> = [
  { label: '全部时间', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '近 7 天', value: 'week' },
  { label: '近 30 天', value: 'month' },
];
// 文件处理队列中三种状态对应的填充色。
export const SHRED_QUEUE_COLORS = {
  completed: '#26a555',
  working: '#0065ff',
  pending: '#e1e5eb',
};
