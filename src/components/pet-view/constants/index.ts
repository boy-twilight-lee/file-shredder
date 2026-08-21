export const PET_ACTION_OPTIONS = [
  { key: 'file', title: '选择文件', description: '支持多选文件' },
  { key: 'directory', title: '选择文件夹', description: '递归处理整个目录' },
  { key: 'path', title: '输入完整路径', description: '粘贴文件或文件夹路径' },
] as const;

export const SHRED_LEVEL_OPTIONS = [
  { value: 3, title: '快速清除', description: '3 次覆写，日常推荐' },
  { value: 7, title: '增强清除', description: '7 次覆写，更加彻底' },
  { value: 35, title: '极限清除', description: '35 次覆写，耗时很长' },
] as const;
