<template>
  <demo-section
    class="section-arco-action"
    title="Arco 操作类"
    description="arco.less 重置的按钮、链接、标签、气泡提示、加载与下拉操作组件"
  >
    <demo-case
      title="button"
      description="按钮统一 8px 圆角与 88px 最小宽度，主按钮带 2px 主题色投影，禁用态透明度 0.4"
    >
      <demo-item label="类型">
        <a-button>默认按钮</a-button>
        <a-button type="primary">主按钮</a-button>
        <a-button type="outline">描边按钮</a-button>
        <a-button type="text">文字按钮</a-button>
      </demo-item>
      <demo-item label="状态">
        <a-button
          type="primary"
          status="normal"
        >
          正常
        </a-button>
        <a-button
          type="secondary"
          status="danger"
        >
          危险操作
        </a-button>
        <a-button
          type="outline"
          status="danger"
        >
          危险描边
        </a-button>
        <a-button
          type="primary"
          disabled
        >
          禁用
        </a-button>
      </demo-item>
      <demo-item label="尺寸">
        <a-button
          type="primary"
          size="mini"
        >
          迷你
        </a-button>
        <a-button
          type="primary"
          size="small"
        >
          小号
        </a-button>
        <a-button type="primary">默认</a-button>
        <a-button
          type="primary"
          size="large"
        >
          大号
        </a-button>
      </demo-item>
      <demo-item label="图标与加载">
        <a-button type="primary">
          <template #icon><svg-icon name="icon-add" /></template>
          新建任务
        </a-button>
        <a-button type="outline">
          <template #icon><svg-icon name="icon-delete" /></template>
          移除目标
        </a-button>
        <a-button
          type="primary"
          loading
        >
          执行中
        </a-button>
        <a-button
          type="primary"
          shape="circle"
        >
          <template #icon><svg-icon name="icon-setting" /></template>
        </a-button>
      </demo-item>
      <demo-item label="通栏按钮">
        <a-button
          type="primary"
          long
        >
          开始清理
        </a-button>
      </demo-item>
    </demo-case>
    <demo-case title="link" description="链接统一 4px 圆角，默认使用主题色，图标与文字间距 4px">
      <demo-item label="基础">
        <a-link>查看清理记录</a-link>
        <a-link :hoverable="false">无悬浮效果</a-link>
        <a-link disabled>禁用链接</a-link>
      </demo-item>
      <demo-item label="带图标">
        <a-link>
          <template #icon><svg-icon name="icon-download" /></template>
          导出记录
        </a-link>
        <a-link>
          <template #icon><svg-icon name="icon-refresh" /></template>
          重新清理
        </a-link>
      </demo-item>
    </demo-case>
    <demo-case
      title="tag"
      description="标签统一 4px 圆角与 12px 字号，内置 correct / label / error / auxiliary / gray / purple / gradient 语义类"
    >
      <demo-item label="默认与关闭">
        <a-tag>默认标签</a-tag>
        <a-tag closable>可关闭标签</a-tag>
        <a-tag
          color="arcoblue"
          size="small"
        >
          小号标签
        </a-tag>
      </demo-item>
      <demo-item label="语义类">
        <a-tag class="correct">清理成功</a-tag>
        <a-tag class="error">清理失败</a-tag>
        <a-tag class="label">被占用</a-tag>
        <a-tag class="auxiliary">辅助信息</a-tag>
        <a-tag class="gray">未开始</a-tag>
        <a-tag class="purple">知识标签</a-tag>
      </demo-item>
      <demo-item label="渐变标签">
        <a-tag class="gradient"><span>AI 智能清理</span></a-tag>
      </demo-item>
    </demo-case>
    <demo-case title="tooltip" description="气泡统一 8px 圆角、6px 8px 内边距与 0.9 不透明度">
      <demo-item label="位置">
        <a-tooltip content="顶部提示">
          <a-button>上</a-button>
        </a-tooltip>
        <a-tooltip
          content="底部提示"
          position="bottom"
        >
          <a-button>下</a-button>
        </a-tooltip>
        <a-tooltip
          content="左侧提示"
          position="left"
        >
          <a-button>左</a-button>
        </a-tooltip>
        <a-tooltip
          content="右侧提示"
          position="right"
        >
          <a-button>右</a-button>
        </a-tooltip>
      </demo-item>
      <demo-item label="长内容">
        <a-tooltip content="清理强度越高，覆写次数越多，大文件执行时间会明显变长">
          <a-tag class="auxiliary">清理强度说明</a-tag>
        </a-tooltip>
      </demo-item>
    </demo-case>
    <demo-case
      title="spin"
      description="加载遮罩用于包裹内容，遮罩图标区域内边距与文字由 arco.less 统一"
    >
      <demo-item label="基础">
        <a-spin :loading="spinLoading" />
        <a-spin
          :loading="true"
          size="small"
        />
        <a-spin
          :loading="true"
          dot
        />
      </demo-item>
      <demo-item label="带提示文字">
        <a-spin
          :loading="spinLoading"
          tip="正在覆写数据"
        />
      </demo-item>
      <demo-item
        label="包裹内容"
        align="top"
      >
        <div class="section-arco-action-spin">
          <a-spin
            :loading="spinLoading"
            tip="正在清理文件"
          >
            <div class="section-arco-action-spin-block">
              安装包.dmg、项目缓存等 4 个目标
            </div>
          </a-spin>
        </div>
      </demo-item>
      <demo-item label="切换加载">
        <a-switch v-model="spinLoading" />
      </demo-item>
    </demo-case>
    <demo-case
      title="dropdown"
      description="下拉弹层复用 arco-trigger-popup 重置，面板 8px 圆角、选项 6px 圆角与 #edf1f7 悬浮底色"
    >
      <demo-item label="基础">
        <a-dropdown>
          <a-button type="outline">
            <template #icon><svg-icon name="icon-more" /></template>
            更多操作
          </a-button>
          <template #content>
            <a-doption>重新清理</a-doption>
            <a-doption>查看详情</a-doption>
            <a-doption disabled>导出报告</a-doption>
          </template>
        </a-dropdown>
      </demo-item>
      <demo-item label="右键触发">
        <a-dropdown trigger="contextMenu">
          <a-tag class="auxiliary">在此区域右键</a-tag>
          <template #content>
            <a-doption>移入待处理列表</a-doption>
            <a-doption>复制目标路径</a-doption>
          </template>
        </a-dropdown>
      </demo-item>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionArcoAction',
});
// 保存加载态示例的开关状态。
const spinLoading = ref(true);
</script>
<style lang="less" scoped>
.section-arco-action {
  .section-arco-action-spin {
    height: 140px;
    width: 320px;
  }
  .section-arco-action-spin-block {
    height: 140px;
    padding: 0 16px;
    border: 1px solid #f2f5fa;
    border-radius: 8px;
    background: #fafbfc;
    color: #474f59;
    font-size: 13px;
    display: flex;
    align-items: center;
  }
}
</style>
