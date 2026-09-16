export interface CxLayoutProps {
  title: string;
  description?: string;
  emphasis?: boolean;
  // 定义标题与说明的排版规格，紧凑规格用于设置页卡片内部。
  size?: 'default' | 'compact';
  direction?: 'horizontal' | 'vertical';
  tag?: 'div' | 'label';
  // 定义标题说明浮层，传入 true 仅启用说明图标，传入文案时同时作为浮层内容。
  tooltip?: boolean | string;
}
