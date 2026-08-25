<template>
  <div class="shred-record-panel">
    <section class="shred-record-panel-card">
      <div class="shred-record-panel-toolbar">
        <div class="shred-record-panel-toolbar-actions">
          <a-popconfirm
            :content="`确认删除选中的 ${selectedLogKeys.length} 条记录？`"
            content-class="settings-view-popconfirm"
            type="error"
            :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
            :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
            @ok="emit('delete-logs', selectedLogKeys)"
          >
            <a-button
              class="shred-record-panel-toolbar-button"
              size="medium"
              status="danger"
              :disabled="selectedLogKeys.length === 0"
            >
              <template #icon><icon-delete /></template>批量删除
            </a-button>
          </a-popconfirm>
          <a-popconfirm
            content="确认删除全部粉碎记录？此操作无法撤销。"
            content-class="settings-view-popconfirm"
            type="error"
            :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
            :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
            @ok="emit('clear-logs')"
          >
            <a-button
              class="shred-record-panel-toolbar-button"
              size="medium"
              status="danger"
              :disabled="logs.length === 0"
            >
              <template #icon><icon-eraser /></template>删除全部
            </a-button>
          </a-popconfirm>
        </div>
        <a-input-search
          v-model="pathKeyword"
          class="shred-record-panel-search"
          size="medium"
          allow-clear
          placeholder="根据文件路径搜索"
        />
      </div>
      <a-table
        v-if="filteredLogs.length === 0"
        class="shred-record-panel-table shred-record-panel-table-empty"
        row-key="id"
        :columns="RECORD_TABLE_COLUMNS"
        :data="[]"
        :row-selection="RECORD_ROW_SELECTION"
        :pagination="false"
        :bordered="false"
        :hoverable="false"
      >
        <template #empty>
          <div class="shred-record-panel-empty">
            <img
              :src="emptyIllustration"
              alt=""
            />
            <strong>{{ emptyStateTitle }}</strong>
            <span>{{ emptyStateDescription }}</span>
          </div>
        </template>
      </a-table>
      <a-scrollbar
        v-else
        class="shred-record-panel-scrollbar-container"
        outer-class="shred-record-panel-scrollbar"
        disable-horizontal
      >
        <a-table
          v-model:selected-keys="selectedLogKeys"
          class="shred-record-panel-table"
          row-key="id"
          :columns="RECORD_TABLE_COLUMNS"
          :data="paginatedLogs"
          :row-selection="RECORD_ROW_SELECTION"
          :pagination="false"
          :bordered="false"
          stripe
        >
          <template #path="{ record }">
            <span
              class="shred-record-panel-path"
              :title="record.path"
              >{{ record.path }}</span
            >
          </template>
          <template #time="{ record }">
            <span class="shred-record-panel-time">{{
              formatLogTime(record.timestamp)
            }}</span>
          </template>
          <template #status="{ record }">
            <a-tag
              class="shred-record-panel-status"
              :color="record.success ? 'green' : 'red'"
            >
              <icon-check-circle v-if="record.success" />
              <icon-close-circle v-else />
              {{ record.success ? '成功' : '失败' }}
            </a-tag>
          </template>
          <template #message="{ record }">
            <span
              class="shred-record-panel-message"
              :title="record.success ? '' : record.message"
            >
              {{ record.success ? '-' : record.message }}
            </span>
          </template>
          <template #actions="{ record }">
            <a-popconfirm
              content="确认删除这条粉碎记录？"
              content-class="settings-view-popconfirm"
              type="error"
              :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
              :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
              @ok="emit('delete-logs', [record.id])"
            >
              <a-link
                status="danger"
                title="删除记录"
                >删除</a-link
              >
            </a-popconfirm>
          </template>
        </a-table>
      </a-scrollbar>
      <a-divider class="shred-record-panel-divider" />
      <div class="shred-record-panel-pagination">
        <a-pagination
          v-model:current="recordPage"
          v-model:page-size="recordPageSize"
          size="small"
          :total="paginationRenderTotal"
          :show-total="true"
          :show-page-size="true"
          :page-size-options="RECORD_PAGE_SIZE_OPTIONS"
          :show-jumper="true"
        >
          <template #total>共 {{ filteredLogs.length }} 条</template>
        </a-pagination>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  IconCheckCircle,
  IconCloseCircle,
  IconDelete,
  IconEraser,
} from '@arco-design/web-vue/es/icon';
import type { ShredLog } from '@/type';
import emptyIllustration from '@/styles/icons/empty.svg';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
  RECORD_PAGE_SIZE,
  RECORD_PAGE_SIZE_OPTIONS,
  RECORD_ROW_SELECTION,
  RECORD_TABLE_COLUMNS,
} from '@/components/settings-view/constants';

const props = defineProps<{ logs: ShredLog[] }>();
const emit = defineEmits<{
  'delete-logs': [ids: Array<string | number>];
  'clear-logs': [];
}>();

const selectedLogKeys = ref<Array<string | number>>([]);
const recordPage = ref(1);
const recordPageSize = ref(RECORD_PAGE_SIZE);
const pathKeyword = ref('');
const filteredLogs = computed(() => {
  const normalizedKeyword = pathKeyword.value.trim().toLocaleLowerCase();
  if (!normalizedKeyword) return props.logs;
  return props.logs.filter((log) =>
    log.path.toLocaleLowerCase().includes(normalizedKeyword),
  );
});
const paginatedLogs = computed(() => {
  const startIndex = (recordPage.value - 1) * recordPageSize.value;
  return filteredLogs.value.slice(
    startIndex,
    startIndex + recordPageSize.value,
  );
});
// Arco 将 total=0 计算为 0 页；渲染总数至少为 1，以便空状态仍展示第 1 页。
const paginationRenderTotal = computed(() =>
  Math.max(filteredLogs.value.length, 1),
);
const emptyStateTitle = computed(() =>
  props.logs.length === 0 ? '暂无粉碎记录' : '未找到匹配路径',
);
const emptyStateDescription = computed(() =>
  props.logs.length === 0
    ? '完成文件粉碎后，处理结果会显示在这里。'
    : '请尝试输入其他文件路径关键字。',
);

function formatLogTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

watch([() => filteredLogs.value.length, recordPageSize], ([logCount]) => {
  // 删除记录、外部刷新或切换每页条数后，确保当前页仍然有效。
  const lastPage = Math.max(1, Math.ceil(logCount / recordPageSize.value));
  recordPage.value = Math.min(recordPage.value, lastPage);
  selectedLogKeys.value = selectedLogKeys.value.filter((id) =>
    props.logs.some((log) => log.id === String(id)),
  );
});

watch(pathKeyword, () => {
  // 新的路径筛选从第一页展示，避免保留旧页码后出现空白页。
  recordPage.value = 1;
});
</script>

<style lang="less" scoped>
@import './style/index.less';
</style>
