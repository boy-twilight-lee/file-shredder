import 'virtual:svg-icons-register';
import App from './App.vue';
import '@/styles/index.less';
import { SvgIcon } from '@/components';
// 创建渲染进程的 Vue 应用实例。
const app = createApp(App);
app.use(SvgIcon);
app.mount('#app');
