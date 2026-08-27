import type { App } from 'vue';
import SvgIconComponent from './index.vue';

const SvgIcon = Object.assign(SvgIconComponent, {
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
