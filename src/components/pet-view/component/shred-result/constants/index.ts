// 定义任务结果面板展示的统计指标。
export const RESULT_METRIC_OPTIONS = [
  {
    key: 'succeeded',
    label: '已删文件',
    icon: 'app-check-circle',
    backgroundIcon: 'app-file',
    tone: 'success',
  },
  {
    key: 'failed',
    label: '删除失败',
    icon: 'app-close-circle',
    backgroundIcon: 'app-warning',
    tone: 'failure',
  },
  {
    key: 'duration',
    label: '处理时间',
    icon: 'app-time',
    backgroundIcon: 'app-time',
    tone: 'duration',
  },
] as const;
