<template>
  <demo-section
    class="section-arco-layer"
    title="Arco 弹层类"
    description="arco.less 重置的消息、对话框与抽屉，弹层挂载到 body，样式对全局生效"
  >
    <demo-case
      title="message"
      description="消息统一 8px 圆角、深色半透明底与 4px 背景模糊，内容单行省略"
    >
      <demo-item label="类型">
        <a-button @click="handleShowMessage('info')">信息</a-button>
        <a-button @click="handleShowMessage('success')">成功</a-button>
        <a-button @click="handleShowMessage('warning')">警告</a-button>
        <a-button @click="handleShowMessage('error')">错误</a-button>
        <a-button @click="handleShowMessage('loading')">加载中</a-button>
      </demo-item>
      <demo-item label="超长内容">
        <a-button @click="handleShowLongMessage">超长文案</a-button>
      </demo-item>
    </demo-case>
    <demo-case
      title="modal"
      description="对话框 16px 圆角，标题栏 53px 高，内容区最小高度 268px，底部按钮居中排列"
    >
      <demo-item label="基础">
        <a-button
          type="primary"
          @click="modalVisible = true"
        >
          打开对话框
        </a-button>
      </demo-item>
      <demo-item label="确认对话框">
        <a-button @click="confirmModalVisible = true">危险操作确认</a-button>
      </demo-item>
      <a-modal
        v-model:visible="modalVisible"
        title="清理确认"
        @ok="handleModalOk"
      >
        <div class="section-arco-layer-body">
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">清理目标</span>
            <span>安装包.dmg、项目缓存（共 4 项）</span>
          </div>
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">清理级别</span>
            <a-tag class="correct">日常清理（3 次覆写）</a-tag>
          </div>
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">执行时间</span>
            <span>2026-09-23 10:24</span>
          </div>
          <a-tag class="error">清理后数据不可恢复，请确认目标无误</a-tag>
        </div>
      </a-modal>
      <a-modal
        v-model:visible="confirmModalVisible"
        title="确认清理该目录"
        hide-cancel
        @ok="handleConfirmModalOk"
      >
        <div class="section-arco-layer-body">
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">目标路径</span>
            <span>D:\项目缓存\构建产物</span>
          </div>
          <a-tag class="error">该目录包含 1286 个文件，清理后无法恢复</a-tag>
        </div>
      </a-modal>
    </demo-case>
    <demo-case
      title="drawer"
      description="抽屉左上与左下圆角 16px，头部 53px 高并使用 #f2f5fa 分隔线"
    >
      <demo-item label="基础">
        <a-button
          type="primary"
          @click="drawerVisible = true"
        >
          打开抽屉
        </a-button>
      </demo-item>
      <demo-item label="底部操作">
        <a-button @click="footerDrawerVisible = true">带底部按钮</a-button>
      </demo-item>
      <a-drawer
        v-model:visible="drawerVisible"
        title="清理记录详情"
        @ok="drawerVisible = false"
      >
        <div class="section-arco-layer-body">
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">记录编号</span>
            <span>9F2C-4471-AB30</span>
          </div>
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">清理时间</span>
            <span>2026-09-23 10:35</span>
          </div>
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">执行结果</span>
            <a-tag class="correct">成功 3 项</a-tag>
            <a-tag class="error">失败 1 项</a-tag>
          </div>
          <a-tag class="auxiliary">失败原因：目标文件被其他进程占用</a-tag>
        </div>
      </a-drawer>
      <a-drawer
        v-model:visible="footerDrawerVisible"
        title="清理设置"
        :footer="true"
        @ok="footerDrawerVisible = false"
      >
        <div class="section-arco-layer-body">
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">清理级别</span>
            <span>日常清理（3 次覆写）</span>
          </div>
          <div class="section-arco-layer-row">
            <span class="section-arco-layer-label">完成通知</span>
            <a-switch
              :model-value="true"
              size="small"
            />
          </div>
        </div>
      </a-drawer>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import { Message } from '@arco-design/web-vue';
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionArcoLayer',
});
// 保存基础对话框的显示状态。
const modalVisible = ref(false);
// 保存确认对话框的显示状态。
const confirmModalVisible = ref(false);
// 保存基础抽屉的显示状态。
const drawerVisible = ref(false);
// 保存带底部操作抽屉的显示状态。
const footerDrawerVisible = ref(false);
// 按类型弹出全局消息，展示 arco-message 的重置样式。
function handleShowMessage(
  type: 'info' | 'success' | 'warning' | 'error' | 'loading',
): void {
  if (type === 'loading') {
    // 加载态消息自动关闭，避免遮挡后续演示。
    Message.loading({ content: '正在覆写磁盘数据', duration: 1500 });
    return;
  }
  if (type === 'success') return Message.success({ content: '清理完成' });
  if (type === 'warning') return Message.warning({ content: '部分文件被占用' });
  if (type === 'error') return Message.error({ content: '清理失败' });
  Message.info({ content: '已加入待处理列表' });
}
// 弹出超长文案，展示消息内容区的单行省略。
function handleShowLongMessage(): void {
  Message.info({
    content:
      '清理任务已完成，共处理 4 个目标，成功 3 项，失败 1 项，失败原因是被其他进程占用',
  });
}
// 确认对话框提交后提示清理已开始。
function handleModalOk(): void {
  Message.success({ content: '已开始清理' });
}
// 危险操作对话框提交后提示已入队。
function handleConfirmModalOk(): void {
  Message.success({ content: '目录清理已入队' });
}
</script>
<style lang="less" scoped>
.section-arco-layer {
  .section-arco-layer-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-arco-layer-row {
    color: #474f59;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-arco-layer-label {
    flex-shrink: 0;
    width: 72px;
    color: #79828f;
    font-size: 13px;
  }
}
</style>
