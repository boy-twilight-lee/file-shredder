import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ArcoResolver } from 'unplugin-vue-components/resolvers';
import electron from 'vite-plugin-electron/simple';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

export default defineConfig(() => {
  return {
    resolve: {
      alias: { '@': resolve('src') },
    },
    build: {
      outDir: 'dist-renderer',
    },
    plugins: [
      vue(),
      // 将业务 SVG 构建为 symbol 雪碧图，组件通过文件名引用对应图标。
      createSvgIconsPlugin({
        iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
        symbolId: 'icon-[name]',
      }),
      // 自动引入 Vue 与 Vue Router 的组合式 API，并生成全局类型声明。
      AutoImport({
        dts: 'src/type/auto-imports.d.ts',
        imports: ['vue', 'vue-router'],
        vueTemplate: true,
      }),
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
  };
});
