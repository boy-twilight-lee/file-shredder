<template>
  <div class="about-page">
    <div class="about-card">
      <div class="about-content">
        <div class="about-visual">
          <img
            class="about-logo"
            :src="appIcon"
            alt="文件粉碎精灵"
          />
          <span class="about-name">FileShredder · 文件粉碎精灵</span>
          <span class="about-version">{{ versionText }}</span>
          <p class="about-description">
            一款面向 Windows 与 macOS
            的本地文件彻底清除工具。通过多遍随机数据覆写与文件项销毁，
            让被删除的数据难以恢复；全部处理均在本机完成，不上传文件内容、路径与任务记录。
          </p>
        </div>
        <a-descriptions
          class="about-info"
          layout="horizontal"
          :column="1"
          align="right"
          :data="aboutInfos"
        />
        <a-button
          type="outline"
          @click="handleOpenRepository"
        >
          开源仓库
        </a-button>
        <span class="about-copyright"
          >Copyright 2024 FileShredder · 基于 MIT 许可开源</span
        >
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Message } from '@arco-design/web-vue';
import appIcon from '@/assets/app-icon.png';
import { resolveErrorMessage } from '@/utils';
defineOptions({
  name: 'AboutPage',
});
// 项目开源仓库地址，供信息列表与「开源仓库」按钮共用。
const repositoryUrl = 'https://github.com/file-shredder/file-shredder';
// 由构建期注入的应用版本号与构建日期拼接而成。
const versionText = `v${__APP_VERSION__} · build ${__APP_BUILD_DATE__}`;
// 关于页展示的许可、运行环境与数据存储信息。
const aboutInfos = [
  { label: '许可', value: 'MIT License' },
  { label: '运行环境', value: 'Electron 39 · Chromium · Node.js' },
  { label: '数据存储', value: '本地应用数据目录' },
  { label: '开源仓库', value: repositoryUrl },
];
// 调用系统默认浏览器打开项目仓库。
async function handleOpenRepository(): Promise<void> {
  try {
    await window.shredderApi.openExternal(repositoryUrl);
  } catch (error) {
    Message.error({ content: resolveErrorMessage(error, '无法打开仓库地址') });
  }
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
