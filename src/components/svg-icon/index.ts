import type { App } from 'vue';
import SvgIconComponent from './index.vue';
// 扩展 SVG 图标组件并提供全局安装能力。
const SvgIcon = Object.assign(SvgIconComponent, {
  // 使用固定名称向 Vue 应用注册 SVG 图标组件。
  install(app: App): void {
    // 使用固定组件名注册，避免构建阶段组件 name 类型缺失导致注册失败。
    app.component('SvgIcon', SvgIconComponent);
  },
});
declare module 'vue' {
  export interface GlobalComponents {
    SvgIcon: typeof SvgIconComponent;
  }
}
export default SvgIcon;
