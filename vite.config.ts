import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist-renderer',
  },
  plugins: [
    vue(),
    // 自动按需引入模板中使用的 Arco 组件、图标及对应样式。
    Components({
      dts: 'src/type/components.d.ts',
      resolvers: [ArcoResolver({ resolveIcons: true })],
    }),
    electron({
      main: { entry: 'electron/main.ts' },
      preload: { input: 'electron/preload.ts' },
      renderer: {},
    }),
  ],
});
