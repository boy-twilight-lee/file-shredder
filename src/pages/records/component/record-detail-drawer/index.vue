<template>
  <a-drawer
    v-model:visible="visible"
    :width="400"
    placement="right"
    title="清理记录详情"
    :footer="true"
    unmount-on-close
  >
    <div
      v-if="log"
      class="record-drawer"
    >
      <div class="record-drawer-list">
        <div
          v-for="item in baseFields"
          :key="item.label"
          class="record-drawer-row"
        >
          <span class="record-drawer-label">{{ item.label }}</span>
          <span class="record-drawer-value">{{ item.value }}</span>
        </div>
        <div class="record-drawer-row">
          <span class="record-drawer-label">执行结果</span>
          <a-tag :class="log.success ? 'correct' : 'error'">
            {{ log.success ? '清理成功' : '清理失败' }}
          </a-tag>
        </div>
      </div>
      <div class="record-drawer-block">
        <span class="record-drawer-block-title">文件明细</span>
        <div class="record-drawer-list">
          <div class="record-drawer-row">
            <span class="record-drawer-label">目标类型</span>
            <span class="record-drawer-value">
              {{ isDirectory ? '文件夹' : '单个文件' }}
            </span>
          </div>
          <div class="record-drawer-row">
            <span class="record-drawer-label">已清除</span>
            <span class="record-drawer-value">{{ succeededCount }} 个</span>
          </div>
          <div class="record-drawer-row">
            <span class="record-drawer-label">未清除</span>
            <span class="record-drawer-value">{{ failedCount }} 个</span>
          </div>
        </div>
      </div>
      <a-tag
        v-if="!log.success"
        :class="['record-drawer-reason', 'error']"
      >
        失败原因：{{ log.message }}
      </a-tag>
      <div class="record-drawer-block">
        <span class="record-drawer-block-title">处理日志</span>
        <div class="record-drawer-logs">
          <div
            v-for="item in logEntries"
            :key="item.time"
            class="record-drawer-log"
          >
            <span class="record-drawer-log-time">{{ item.time }}</span>
            <span class="record-drawer-log-text">{{ item.message }}</span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <a-button @click="handleClose">关闭</a-button>
      <a-button
        type="primary"
        @click="handleExport"
      >
        导出记录
      </a-button>
    </template>
  </a-drawer>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { ShredLog } from '@/type';
import {
  formatDateTime,
  formatDuration,
  isShredPasses,
  resolveFileName,
  resolvePassesLabel,
} from '@/utils';
defineOptions({
  name: 'RecordDetailDrawer',
});
const props = defineProps<{
  visible: boolean;
  log: ShredLog | null;
}>();
const emits = defineEmits<{
  (e: 'update:visible', visible: boolean): void;
  (e: 'export'): void;
}>();
// 抽屉显示状态，关闭动作回传页面统一管理。
const visible = computed<boolean>({
  get: () => props.visible,
  set: (value) => emits('update:visible', value),
});
// 当前记录是否为文件夹目标。
const isDirectory = computed(() => props.log?.targetType === 'directory');
// 本次记录中成功清除的文件数量。
const succeededCount = computed(() => {
  const log = props.log;
  if (!log) return 0;
  if (isDirectory.value) return log.succeededCount ?? 0;
  return log.success ? 1 : 0;
});
// 本次记录中未能清除的文件数量。
const failedCount = computed(() => {
  const log = props.log;
  if (!log) return 0;
  if (isDirectory.value) return log.failedCount ?? 0;
  return log.success ? 0 : 1;
});
// 抽屉基础字段：记录编号、清理时间、清理级别、目标名称、目标路径与消耗时间。
const baseFields = computed(() => {
  const log = props.log;
  if (!log) return [];
  return [
    { label: '记录编号', value: log.id },
    { label: '清理时间', value: formatDateTime(log.timestamp) },
    {
      label: '清理级别',
      value: isShredPasses(log.passes) ? resolvePassesLabel(log.passes) : '—',
    },
    { label: '目标名称', value: resolveFileName(log.path) },
    { label: '目标路径', value: log.path },
    {
      label: '消耗时间',
      value: log.durationMs ? formatDuration(log.durationMs) : '—',
    },
  ];
});
// 该记录的处理日志条目，记录完成时写入一条结论文案。
const logEntries = computed(() => {
  const log = props.log;
  if (!log) return [];
  return [{ time: formatDateTime(log.timestamp), message: log.message }];
});
// 关闭抽屉。
function handleClose(): void {
  visible.value = false;
}
// 通知页面导出记录。
function handleExport(): void {
  emits('export');
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
