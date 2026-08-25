import App from './App.vue';
import './styles/index.less';

// 页面组件按需引入 Arco 能力，避免首屏解析整套组件库。
createApp(App).mount('#app');
