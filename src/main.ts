import { createApp } from 'vue';
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import App from './App.vue';
import './styles/index.less';

createApp(App).use(ArcoVue).mount('#app');
