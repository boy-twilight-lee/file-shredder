export const RESULT_METRIC_OPTIONS = [
  {
    key: 'succeeded',
    label: '已删文件',
    icon: 'result-check-filled',
    backgroundIcon: 'result-file',
    tone: 'success',
  },
  {
    key: 'failed',
    label: '删除失败',
    icon: 'result-close-filled',
    backgroundIcon: 'result-warning',
    tone: 'failure',
  },
  {
    key: 'duration',
    label: '处理时间',
    icon: 'result-clock',
    backgroundIcon: 'result-clock',
    tone: 'duration',
  },
] as const;
