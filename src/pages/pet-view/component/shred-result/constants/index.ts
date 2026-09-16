// 定义任务结果面板展示的统计指标。
export const RESULT_METRIC_OPTIONS = [
  {
    key: 'succeeded',
    label: '已删文件',
    icon: 'icon-check-circle',
    backgroundIcon: 'icon-file',
    tone: 'success',
  },
  {
    key: 'failed',
    label: '删除失败',
    icon: 'icon-close-circle',
    backgroundIcon: 'icon-warning',
    tone: 'failure',
  },
  {
    key: 'duration',
    label: '处理时间',
    icon: 'icon-time',
    backgroundIcon: 'icon-time',
    tone: 'duration',
  },
] as const;
