import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import {
  ArcoResolver,
  ElementPlusResolver,
} from 'unplugin-vue-components/resolvers';
import electron from 'vite-plugin-electron/simple';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
// 生成渲染进程、主进程与预加载脚本的统一构建配置。
export default defineConfig(() => {
  // 统一源码目录别名供三个构建入口复用。
  const alias = { '@': resolve('src') };
  return {
    resolve: {
      alias,
    },
    build: {
      outDir: 'dist-renderer',
    },
    plugins: [
      vue(),
      // 将 icon-xxx 命名的业务 SVG 构建为同名 symbol 雪碧图，组件按名称直接从雪碧图取用图标。
      createSvgIconsPlugin({
        iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
        symbolId: '[name]',
      }),
      Components({
        dts: 'src/type/components.d.ts',
        resolvers: [
          ArcoResolver({
            importStyle: 'css',
          }),
          ElementPlusResolver(),
        ],
      }),
      AutoImport({
        dts: 'src/type/auto-imports.d.ts',
        imports: ['vue', 'vue-router'],
        include: ['src/**/*.{ts,vue}'],
        eslintrc: {
          enabled: true,
        },
      }),
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: { resolve: { alias } },
        },
        preload: { input: 'electron/preload.ts' },
        renderer: {},
      }),
    ],
  };
});
