<template>
  <div class="demo-page">
    <div class="demo-page-nav">
      <div class="demo-page-brand">
        <img
          class="demo-page-logo"
          :src="appIcon"
          alt="文件粉碎精灵"
        />
        <div class="demo-page-brand-text">
          <span class="demo-page-brand-title">组件与图标总览</span>
          <span class="demo-page-brand-desc">文件粉碎精灵 · 设计资源自查</span>
        </div>
      </div>
      <div class="demo-page-menu">
        <div
          v-for="item in navigations"
          :key="item.key"
          :class="[
            'demo-page-menu-item',
            { 'demo-page-menu-item-active': activeKey === item.key },
          ]"
          @click="handleNavigationChange(item.key)"
        >
          <span class="demo-page-menu-label">{{ item.label }}</span>
          <span class="demo-page-menu-scope">{{ item.scope }}</span>
        </div>
      </div>
    </div>
    <div class="demo-page-body">
      <section-components v-show="activeKey === 'components'" />
      <section-icons v-show="activeKey === 'icons'" />
      <section-arco-form v-show="activeKey === 'arco-form'" />
      <section-arco-action v-show="activeKey === 'arco-action'" />
      <section-arco-layer v-show="activeKey === 'arco-layer'" />
      <section-arco-navigation v-show="activeKey === 'arco-navigation'" />
      <section-element v-show="activeKey === 'element'" />
    </div>
  </div>
</template>
<script setup lang="ts">
import appIcon from '@/assets/app-icon.png';
import SectionArcoAction from './component/section-arco-action.vue';
import SectionArcoForm from './component/section-arco-form.vue';
import SectionArcoLayer from './component/section-arco-layer.vue';
import SectionArcoNavigation from './component/section-arco-navigation.vue';
import SectionComponents from './component/section-components.vue';
import SectionElement from './component/section-element.vue';
import SectionIcons from './component/section-icons.vue';
// 汇总 demo 窗口左侧导航，key 同时作为内容区的显示标识。
const navigations = [
  { key: 'components', label: '业务组件', scope: 'src/components' },
  { key: 'icons', label: '图标总览', scope: 'src/assets/icons' },
  { key: 'arco-form', label: 'Arco 表单类', scope: 'styles/arco.less' },
  { key: 'arco-action', label: 'Arco 操作类', scope: 'styles/arco.less' },
  { key: 'arco-layer', label: 'Arco 弹层类', scope: 'styles/arco.less' },
  { key: 'arco-navigation', label: 'Arco 导航类', scope: 'styles/arco.less' },
  { key: 'element', label: 'Element Plus', scope: 'styles/arco.less' },
];
// 保存当前展示的导航分组标识。
const activeKey = ref(navigations[0].key);
// 切换内容区当前展示的分组。
function handleNavigationChange(key: string): void {
  activeKey.value = key;
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
