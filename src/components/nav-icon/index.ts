import type { App } from 'vue';
import NavIconComponent from './index.vue';
// 扩展导航图标组件并提供全局安装能力。
const NavIcon = Object.assign(NavIconComponent, {
  // 使用固定名称向 Vue 应用注册承载图标动效的组件。
  install(app: App): void {
    app.component('NavIcon', NavIconComponent);
  },
});
declare module 'vue' {
  export interface GlobalComponents {
    NavIcon: typeof NavIconComponent;
  }
}
export default NavIcon;
