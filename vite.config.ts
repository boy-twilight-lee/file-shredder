import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
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
  // 设计 Token 变量文件路径，Less 需要 POSIX 分隔符才能正确解析绝对路径。
  const designTokens = resolve('src/styles/tokens.less').split('\\').join('/');
  // 读取 package.json，作为应用版本号的唯一来源。
  const packageJson = JSON.parse(
    readFileSync(resolve('package.json'), 'utf-8'),
  ) as {
    version: string;
  };
  // 构建日期按 YYYYMMDD 形式注入，供「关于」页展示。
  const buildDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return {
    resolve: {
      alias,
    },
    css: {
      preprocessorOptions: {
        less: {
          // 将只含变量的设计 Token 注入每个 Less 文件，组件样式可直接引用。
          additionalData: `@import "${designTokens}";`,
        },
      },
    },
    // 将应用版本与构建日期注入渲染进程，避免在组件中硬编码。
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
      __APP_BUILD_DATE__: JSON.stringify(buildDate),
    },
    build: {
      outDir: 'dist-renderer',
    },
    plugins: [
      vue(),
      // 将 icon-xxx 命名的业务 SVG 构建为同名 symbol 雪碧图，组件按名称直接从雪碧图取用图标。
      createSvgIconsPlugin({
        iconDirs: [
          resolve(process.cwd(), 'src/assets/icons'),
          resolve(process.cwd(), 'src/assets/icon-source'),
          resolve(process.cwd(), 'src/assets/icons-components'),
        ],
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
