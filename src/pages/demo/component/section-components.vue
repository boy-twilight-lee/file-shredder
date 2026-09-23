<template>
  <demo-section
    class="section-components"
    title="业务组件"
    description="src/components 下的业务组件、主要属性变体与插槽用法"
  >
    <demo-case
      title="svg-icon"
      description="按雪碧图 symbol 名称渲染图标，尺寸与颜色由 props 控制，颜色默认继承当前文字颜色"
    >
      <demo-item label="默认尺寸">
        <svg-icon name="icon-add" />
        <svg-icon name="icon-search" />
        <svg-icon name="icon-delete" />
        <svg-icon name="icon-edit" />
        <svg-icon name="icon-copy" />
      </demo-item>
      <demo-item label="size 数值与字符串">
        <svg-icon
          name="icon-star"
          :size="12"
        />
        <svg-icon
          name="icon-star"
          :size="16"
        />
        <svg-icon
          name="icon-star"
          :size="24"
        />
        <svg-icon
          name="icon-star"
          :size="32"
        />
        <svg-icon
          name="icon-star"
          size="2em"
        />
      </demo-item>
      <demo-item label="size 数组">
        <svg-icon
          name="icon-image"
          :size="[36, 18]"
        />
        <svg-icon
          name="icon-heart"
          :size="[12, 24]"
        />
      </demo-item>
      <demo-item label="color">
        <svg-icon
          name="icon-heart"
          :size="20"
          color="#0065ff"
        />
        <svg-icon
          name="icon-heart"
          :size="20"
          color="#ff4c26"
        />
        <svg-icon
          name="icon-heart"
          :size="20"
          color="#26a555"
        />
        <span class="section-components-inherit">
          <svg-icon
            name="icon-heart"
            :size="20"
          />
        </span>
      </demo-item>
      <demo-item label="配合其他组件">
        <a-button type="primary">
          <template #icon><svg-icon name="icon-add" /></template>
          新建清理任务
        </a-button>
        <a-button>
          <template #icon><svg-icon name="icon-delete" /></template>
          移除目标
        </a-button>
        <a-link>
          <template #icon><svg-icon name="icon-download" /></template>
          导出记录
        </a-link>
      </demo-item>
    </demo-case>
    <demo-case
      title="cx-empty"
      description="空状态组件，可通过 description、imgSrc 或 image / description 插槽定制"
    >
      <div class="section-components-empties">
        <div class="section-components-empty">
          <cx-empty />
        </div>
        <div class="section-components-empty">
          <cx-empty description="没有匹配的清理记录" />
        </div>
        <div class="section-components-empty">
          <cx-empty
            :img-src="appIcon"
            description="imgSrc 替换插画"
          />
        </div>
        <div class="section-components-empty">
          <cx-empty>
            <template #image>
              <svg-icon
                name="icon-no-data"
                :size="72"
              />
            </template>
            <template #description>image 插槽替换插画</template>
          </cx-empty>
        </div>
      </div>
    </demo-case>
    <demo-case
      title="cx-pagination"
      description="基于 a-pagination 封装，分页箭头与省略号统一替换为业务图标，页码与每页条数通过事件回传"
    >
      <demo-item label="基础分页">
        <cx-pagination
          :current="pagination.current"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          @change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </demo-item>
      <demo-item label="自定义每页条数">
        <cx-pagination
          :current="1"
          :page-size="20"
          :total="160"
          :sizes="[20, 40, 80]"
        />
      </demo-item>
      <demo-item label="当前状态">
        <span class="section-components-state">
          第 {{ pagination.current }} 页 / 每页 {{ pagination.pageSize }} 条 / 共
          {{ pagination.total }} 条
        </span>
      </demo-item>
    </demo-case>
    <demo-case
      title="cx-table"
      description="基于 el-table 封装，统一表头、斑马纹、固定列、分页与空状态，并支持按列名透传插槽"
    >
      <demo-item
        label="基础表格"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            :data="tableRows"
            :columns="tableColumns"
            row-key="id"
            :show-pagination="false"
          />
        </div>
      </demo-item>
      <demo-item
        label="多选与分页"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            v-model:select-keys="tableSelectKeys"
            :data="tableRows"
            :columns="tableColumns"
            row-key="id"
            :total="128"
            :page-size="20"
          />
        </div>
      </demo-item>
      <demo-item
        label="自定义列插槽"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            :data="tableRows"
            :columns="tableSlotColumns"
            row-key="id"
            :show-pagination="false"
          >
            <template #name="{ row }">
              <span class="section-components-file">
                <svg-icon
                  :name="
                    row.targetType === 'directory'
                      ? 'icon-folder'
                      : 'icon-file'
                  "
                />
                {{ row.name }}
              </span>
            </template>
            <template #result="{ row }">
              <a-tag :class="row.success ? 'correct' : 'error'">
                {{ row.result }}
              </a-tag>
            </template>
            <template #opera="{ row }">
              <a-link>{{ row.success ? '查看详情' : '重试清理' }}</a-link>
            </template>
          </cx-table>
        </div>
      </demo-item>
      <demo-item
        label="加载中"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            :data="[]"
            :columns="tableColumns"
            row-key="id"
            loading
            :show-pagination="false"
          />
        </div>
      </demo-item>
      <demo-item
        label="空数据"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            :data="[]"
            :columns="tableColumns"
            row-key="id"
            empty-text="还没有清理记录"
            :show-pagination="false"
          />
        </div>
      </demo-item>
      <demo-item
        label="多级表头"
        align="top"
      >
        <div class="section-components-table">
          <cx-table
            :data="tableRows"
            :columns="tableTreeColumns"
            row-key="id"
            :show-pagination="false"
          />
        </div>
      </demo-item>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import appIcon from '@/assets/app-icon.png';
import { CxEmpty, CxPagination, CxTable, TableColumnData } from '@/components';
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionComponents',
});
// 汇总分页演示当前使用的页码、每页条数与记录总数。
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 128,
});
// 汇总表格演示使用的清理记录数据。
const tableRows = [
  {
    id: '1',
    name: '安装包.dmg',
    targetType: 'file',
    size: '182.4 MB',
    result: '已清理',
    success: true,
    time: '2026-09-21 10:24',
  },
  {
    id: '2',
    name: '项目缓存',
    targetType: 'directory',
    size: '1.2 GB',
    result: '已清理',
    success: true,
    time: '2026-09-21 10:26',
  },
  {
    id: '3',
    name: '临时日志.log',
    targetType: 'file',
    size: '32 KB',
    result: '被占用',
    success: false,
    time: '2026-09-21 10:31',
  },
  {
    id: '4',
    name: '旧版备份',
    targetType: 'directory',
    size: '486 MB',
    result: '已清理',
    success: true,
    time: '2026-09-21 10:35',
  },
];
// 汇总基础表格列定义。
const tableColumns: TableColumnData[] = [
  { type: 'selection' },
  { prop: 'name', label: '目标名称', width: 200 },
  { prop: 'targetType', label: '类型', width: 110 },
  { prop: 'size', label: '大小', width: 120 },
  { prop: 'result', label: '状态', width: 120 },
  { prop: 'time', label: '执行时间' },
];
// 汇总带自定义插槽的表格列定义。
const tableSlotColumns: TableColumnData[] = [
  { prop: 'name', label: '目标名称', width: 200 },
  { prop: 'size', label: '大小', width: 120 },
  { prop: 'result', label: '状态', width: 120 },
  { prop: 'opera', label: '操作', width: 130 },
];
// 汇总多级表头列定义。
const tableTreeColumns: TableColumnData[] = [
  { prop: 'name', label: '目标名称', width: 220 },
  {
    label: '清理结果',
    children: [
      { prop: 'targetType', label: '类型', width: 110 },
      { prop: 'size', label: '大小', width: 120 },
    ],
  },
  { prop: 'time', label: '执行时间' },
];
// 保存表格多选演示当前选中的记录标识。
const tableSelectKeys = ref<string[]>([]);
// 同步分页页码到演示状态。
function handlePageChange(current: number): void {
  pagination.current = current;
}
// 同步每页条数到演示状态。
function handlePageSizeChange(pageSize: number): void {
  pagination.pageSize = pageSize;
}
</script>
<style lang="less" scoped>
.section-components {
  .section-components-inherit {
    color: #903da8;
  }
  .section-components-empties {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .section-components-empty {
    height: 240px;
    width: 240px;
    border: 1px dashed #e1e5eb;
    border-radius: 8px;
    background: #fafbfc;
  }
  .section-components-state {
    color: #474f59;
    font-size: 13px;
  }
  .section-components-table {
    height: 320px;
    width: 100%;
    overflow: hidden;
    border: 1px solid #f2f5fa;
    border-radius: 8px;
  }
  .section-components-file {
    color: #474f59;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}
</style>
