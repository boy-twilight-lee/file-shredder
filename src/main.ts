import 'virtual:svg-icons-register';
import SvgIcon from '@/components/svg-icon';
import App from './App.vue';
import './styles/index.less';

// 页面组件按需引入 Arco 能力，避免首屏解析整套组件库。
const app = createApp(App);

app.use(SvgIcon);
app.mount('#app');
