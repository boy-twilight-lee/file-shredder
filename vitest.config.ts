import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
// 渲染进程与主进程共用同一套路径别名，保证单元测试可复用源码导入写法。
export default defineConfig({
  // 将构建缓存收敛到仓库内，避免受限环境下写入系统临时目录失败。
  cacheDir: 'node_modules/.vitest',
  resolve: {
    alias: {
      '@': resolve('src'),
    },
  },
  test: {
    environment: 'node',
    // 单测规模很小，串行执行可避免并行工作进程争用模块缓存导致的收集失败。
    fileParallelism: false,
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
  },
});
