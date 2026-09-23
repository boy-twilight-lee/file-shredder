<template>
  <demo-section
    class="section-arco-navigation"
    title="Arco 导航类"
    description="arco.less 重置的分页与滚动条，分页跳转前置文案与滚动条滑块尺寸均已改写"
  >
    <demo-case
      title="pagination"
      description="页码 28px 高、8px 圆角，选中项使用 8% 主题色底，跳转前自动补「跳至」文案"
    >
      <demo-item label="基础">
        <a-pagination
          v-model:current="paginationCurrent"
          :total="120"
        />
      </demo-item>
      <demo-item label="完整功能">
        <a-pagination
          v-model:current="paginationCurrent"
          v-model:page-size="paginationPageSize"
          :total="426"
          :page-size-options="[10, 20, 50]"
          show-page-size
          show-jumper
          show-total
        />
      </demo-item>
      <demo-item label="简单模式">
        <a-pagination
          v-model:current="paginationCurrent"
          :total="120"
          simple
        />
      </demo-item>
      <demo-item label="尺寸与禁用">
        <a-pagination
          v-model:current="paginationCurrent"
          :total="120"
          size="small"
        />
        <a-pagination
          :total="120"
          disabled
        />
      </demo-item>
      <demo-item label="当前状态">
        <span class="section-arco-navigation-state">
          第 {{ paginationCurrent }} 页 / 每页 {{ paginationPageSize }} 条
        </span>
      </demo-item>
    </demo-case>
    <demo-case
      title="scrollbar"
      description="滚动条轨道 10px、滑块 6px，底色 #e1e5eb，悬浮加深为 #c9ced6"
    >
      <demo-item
        label="垂直滚动"
        align="top"
      >
        <a-scrollbar class="section-arco-navigation-scroll">
          <div
            v-for="item in scrollItems"
            :key="item"
            class="section-arco-navigation-line"
          >
            {{ item }}
          </div>
        </a-scrollbar>
      </demo-item>
      <demo-item
        label="水平滚动"
        align="top"
      >
        <a-scrollbar class="section-arco-navigation-scroll-horizontal">
          <div class="section-arco-navigation-track">
            <div
              v-for="item in scrollItems"
              :key="item"
              class="section-arco-navigation-card"
            >
              {{ item }}
            </div>
          </div>
        </a-scrollbar>
      </demo-item>
      <demo-item
        label="页面级滚动条"
        align="top"
      >
        <a-scrollbar
          class="section-arco-navigation-scroll"
          type="page"
        >
          <div
            v-for="item in scrollItems"
            :key="item"
            class="section-arco-navigation-line"
          >
            {{ item }}
          </div>
        </a-scrollbar>
      </demo-item>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionArcoNavigation',
});
// 保存分页演示当前页码。
const paginationCurrent = ref(1);
// 保存分页演示每页条数。
const paginationPageSize = ref(20);
// 提供滚动条演示使用的长列表数据。
const scrollItems = Array.from(
  { length: 20 },
  (_, index) => `清理记录 ${String(index + 1).padStart(2, '0')}`,
);
</script>
<style lang="less" scoped>
.section-arco-navigation {
  .section-arco-navigation-state {
    color: #474f59;
    font-size: 13px;
  }
  .section-arco-navigation-scroll {
    height: 180px;
    width: 360px;
    padding: 8px;
    border: 1px solid #f2f5fa;
    border-radius: 8px;
    background: #fafbfc;
  }
  .section-arco-navigation-scroll-horizontal {
    width: 360px;
    padding: 8px;
    border: 1px solid #f2f5fa;
    border-radius: 8px;
    background: #fafbfc;
  }
  .section-arco-navigation-line {
    height: 32px;
    color: #474f59;
    font-size: 13px;
    line-height: 32px;
  }
  .section-arco-navigation-track {
    display: flex;
    gap: 8px;
  }
  .section-arco-navigation-card {
    flex-shrink: 0;
    height: 64px;
    width: 120px;
    border: 1px solid #e1e5eb;
    border-radius: 8px;
    background: #fff;
    color: #474f59;
    font-size: 13px;
    line-height: 64px;
    text-align: center;
  }
}
</style>
