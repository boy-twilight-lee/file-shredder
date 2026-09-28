import { PageKey } from '@/type';
// 描述侧边导航与顶部标题栏共用的页面元数据。
export interface NavigationItem {
  key: PageKey;
  label: string;
  description: string;
  icon: string;
}
// 定义应用的全部页面，顺序即侧边导航展示顺序。
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    key: 'shred',
    label: '清理任务',
    description: '选择目标并执行文件清理',
    icon: 'icon-nav-shred',
  },
  {
    key: 'records',
    label: '清理记录',
    description: '查看与筛选历史清理结果',
    icon: 'icon-nav-records',
  },
  {
    key: 'settings',
    label: '设置',
    description: '清理默认值与系统集成',
    icon: 'icon-nav-settings',
  },
  {
    key: 'about',
    label: '关于',
    description: '版本、许可与项目说明',
    icon: 'icon-nav-about',
  },
];
// 应用启动后默认展示的页面。
export const DEFAULT_PAGE_KEY: PageKey = 'shred';
