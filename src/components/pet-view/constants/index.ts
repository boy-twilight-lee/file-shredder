import type {
  ButtonProps,
  TableColumnData,
  TableRowSelection,
} from '@arco-design/web-vue';
import type { VirtualListProps } from '@arco-design/web-vue/es/_components/virtual-list-v2/interface';

export const PET_ACTION_OPTIONS = [
  {
    key: 'file',
    title: '选择文件',
    description: '支持同时选择多个文件',
    badge: '常用',
    tone: 'blue',
  },
  {
    key: 'directory',
    title: '选择文件夹',
    description: '包含文件夹内的所有内容',
    badge: '递归清理',
    tone: 'green',
  },
  {
    key: 'settings',
    title: '设置',
    description: '调整桌宠、清理强度和系统选项',
    badge: '个性化',
    tone: 'purple',
  },
  {
    key: 'records',
    title: '粉碎记录',
    description: '查看文件与文件夹的历史清理结果',
    badge: '历史记录',
    tone: 'orange',
  },
  {
    key: 'close',
    title: '关闭桌宠',
    description: '退出文件粉碎精灵',
    badge: '谨慎操作',
    tone: 'red',
  },
] as const;

// 左键移动超过该距离后视为拖拽，避免释放鼠标时误打开操作菜单。
export const PET_CLICK_DRAG_THRESHOLD = 5;

// 按总体完成度切换阶段色，让用户无需读取数字也能感知任务进程。
export const PROGRESS_TONE_OPTIONS = [
  { maximum: 30, tone: 'blue' },
  { maximum: 60, tone: 'purple' },
  { maximum: 90, tone: 'orange' },
  { maximum: 100, tone: 'green' },
] as const;

export const PET_SIZE_SAVE_DELAY_MS = 300;
export const PET_SIZE_MIN = 50;
export const PET_SIZE_MAX = 700;
export const PET_SIZE_STEP = 4;

// 确认浮层统一使用中等按钮，适配桌宠气泡中的鼠标操作点击面积。
export const MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS: ButtonProps = {
  size: 'medium',
  type: 'outline',
};
export const MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS: ButtonProps = {
  size: 'medium',
  type: 'primary',
};

// 设置删除等级
export const SHRED_LEVEL_OPTIONS = [
  {
    value: 0,
    title: '极速删除',
    badge: '最快',
    description: '直接删除，不覆写',
  },
  {
    value: 3,
    title: '日常清理',
    badge: '推荐',
    description: '覆写 3 次，适合日常',
  },
  {
    value: 7,
    title: '加强清理',
    badge: '更安全',
    description: '覆写 7 次，更安全',
  },
  {
    value: 35,
    title: '深度清理',
    badge: '非常慢',
    description: '覆写 35 次，耗时较长',
  },
] as const;

// 粉碎记录表格
export const SHRED_RECORD_COLUMNS: TableColumnData[] = [
  {
    title: '文件路径',
    dataIndex: 'path',
    slotName: 'path-cell',
    width: 250,
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '状态',
    dataIndex: 'success',
    slotName: 'status-cell',
    width: 100,
  },
  {
    title: '处理结果',
    dataIndex: 'message',
    slotName: 'result-cell',
    width: 250,
    ellipsis: true,
    tooltip: true,
  },
  {
    title: '粉碎时间',
    dataIndex: 'timestamp',
    slotName: 'time-cell',
    width: 160,
    ellipsis: true,
    tooltip: true,
  },
];

export const SHRED_RECORD_ROW_SELECTION: TableRowSelection = {
  type: 'checkbox',
  showCheckedAll: true,
  width: 44,
  fixed: true,
};

// 横向尺寸等于选择列和所有数据列之和，空间不足时由 Arco 提供横向滚动。
export const SHRED_RECORD_TABLE_SCROLL = { x: 804, y: 406 };
export const SHRED_RECORD_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

export const SHRED_RECORD_VIRTUAL_LIST_PROPS: VirtualListProps = {
  height: 406,
  threshold: 20,
  fixedSize: true,
  estimatedSize: 44,
  buffer: 8,
};
