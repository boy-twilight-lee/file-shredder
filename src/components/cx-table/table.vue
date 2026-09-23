<template>
  <a-spin
    :loading="loading"
    class="cx-table-wrapper"
    :style="{
      minHeight: data.length ? '' : '250px',
    }"
  >
    <!-- table -->
    <div class="cx-table">
      <!-- table本体 -->
      <el-table
        :data="data"
        :row-key="rowKey"
        :style="{
          height: '100%',
          width: '100%',
        }"
        :allow-drag-last-column="false"
        :header-cell-class-name="getHeaderCellClass"
        header-row-class-name="cx-table-header-row"
        cell-class-name="cx-table-cell"
        row-class-name="cx-table-row"
        border
        ref="tableRef"
        v-bind="$attrs"
        @header-dragend="handleHeaderDragend"
        @selection-change="handleSelect"
      >
        <table-column
          v-for="(v, i) in columns"
          :key="i"
          v-bind="v"
          :resizable="isColumnResizable(v, columns, i)"
          :fixed="getFixed(v, columns, i)"
          :width="getWidth(v)"
        >
          <!-- 修正表头插槽 -->
          <template #header>
            <div
              class="custom-header-cell"
              @click="handleSortChange(v.prop!)"
            >
              <slot
                v-if="$slots[`${v.prop}Header`]"
                :name="`${v.prop}Header`"
                :column="v"
              >
                {{ v.label || v.prop }}
              </slot>
              <a-tooltip
                v-else
                :mouse-enter-delay="500"
                :content="v.label"
              >
                <div class="text-ellipsis">
                  {{ v.label || v.prop }}
                </div>
              </a-tooltip>
            </div>
          </template>
          <!-- 渲染默认插槽 -->
          <template
            v-if="v.type != 'selection'"
            #default="scope"
          >
            <slot
              :name="v.prop"
              v-bind="scope"
            >
              <span v-if="!v.children?.length">
                <slot
                  :column="v"
                  :row="scope.row"
                >
                  {{ formatEmptyValue(scope.row[v.prop!]) }}
                </slot>
              </span>
              <template v-else>
                <table-column
                  v-for="(v1, i1) in v.children"
                  :key="i1"
                  v-bind="v1"
                  :resizable="isColumnResizable(v1, v.children, i1)"
                  :fixed="getFixed(v1, v.children, i1)"
                  :width="getWidth(v1)"
                >
                  <template #default="scope1">
                    <slot
                      :name="v1.prop"
                      v-bind="scope1"
                    >
                      {{ formatEmptyValue(scope1.row[v1.prop!]) }}
                    </slot>
                  </template>
                </table-column>
              </template>
            </slot>
          </template>
        </table-column>
        <template #empty>
          <div style="width: 0; height: 0"></div>
        </template>
      </el-table>
    </div>
    <!-- pagintion -->
    <div
      v-if="showPagination && data.length"
      class="cx-table-pagination"
    >
      <yc-pagination
        v-model:current="computedCurrent"
        v-model:page-size="computedPagesize"
        :total="total"
      />
    </div>
    <!-- empty -->
    <div
      v-else-if="!data.length && !loading"
      class="cx-table-empty"
    >
      <yc-empty :description="emptyText">
        <template #image>
          <slot
            v-if="$slots.empty"
            name="empty"
          />
        </template>
      </yc-empty>
    </div>
  </a-spin>
</template>

<script lang="ts" setup>
import { isBoolean, isEmpty, isNumber, isUndefined } from 'lodash-es';
import { ref, toRefs } from 'vue';
import { useControlValue } from '@/hooks';
import { TableInstance } from 'element-plus';
import { TableColumnData } from './type';
import TableColumn from './table-column.vue';
import YcEmpty from '@/components/cx-empty';
import YcPagination from '@/components/cx-pagination';
const props = withDefaults(
  defineProps<{
    data?: Record<string, any>[];
    columns?: TableColumnData[];
    selectKeys?: string[];
    defaultSelectKeys?: string[];
    rowKey?: string;
    showPagination?: boolean;
    current?: number;
    pageSize?: number;
    total?: number;
    emptyText?: string;
    loading?: boolean;
    fixedRightRow?: boolean;
  }>(),
  {
    data: () => [],
    columns: () => [],
    selectKeys: () => [],
    defaultSelectKeys: () => [],
    showPagination: true,
    current: 1,
    pageSize: 20,
    total: 0,
    emptyText: '暂无数据',
    loading: false,
    fixedRightRow: true,
  },
);
const emits = defineEmits<{
  (e: 'update:current', value: number): void;
  (e: 'update:pageSize', value: number): void;
  (e: 'update:selectKeys', value: number): void;
  (e: 'change', value: number): void;
  (e: 'pageSizeChange', value: number): void;
  (e: 'sort-change', column: string): void;
  (e: 'selection-change', value: string[]): void;
}>();
const {
  current,
  pageSize,
  data,
  columns,
  defaultSelectKeys,
  selectKeys,
  rowKey,
} = toRefs(props);
// 计算data映射
const dataMap = computed(() => {
  return Object.fromEntries(
    data.value.map((item) => [item[rowKey.value!], item]),
  );
});
// 计算的selectKeys
const computedSelectKeys = useControlValue<string[]>(
  selectKeys,
  defaultSelectKeys.value,
  (val) => {
    emits('update:selectKeys', val);
    emits('selection-change', val);
  },
);
// current
const computedCurrent = useControlValue(current, 1, (val) => {
  emits('update:current', val);
  emits('change', val);
});
// pageSize
const computedPagesize = useControlValue(pageSize, 10, (val) => {
  emits('update:pageSize', val);
  emits('pageSizeChange', val);
});
// 是否是由选中改变的
let isSelectChange = false;
// 表格ref
const tableRef = ref<TableInstance>();
// 格式化空值
const formatEmptyValue = (value: any) => {
  return isEmpty(value) && !isNumber(value) && !isBoolean(value) ? '-' : value;
};
// column是否resizeable
const isColumnResizable = (
  column: TableColumnData,
  columns: TableColumnData[],
  i: number,
) => {
  if (!isUndefined(column.resizable)) {
    return column.resizable;
  }
  return (
    i < columns.length - 1 &&
    column.type != 'selection' &&
    !column?.children?.length
  );
};
// 计算fixed
const getFixed = (
  column: TableColumnData,
  columns: TableColumnData[],
  i: number,
) => {
  if (!isUndefined(column.fixed)) {
    return column.fixed;
  }
  if (column.children?.length) {
    return;
  }
  if (i == 0 || (columns[0].type == 'selection' && i == 1)) {
    return 'left';
  }
  if (i == columns.length - 1 && props.fixedRightRow) {
    return 'right';
  }
};
// 计算width
const getWidth = (column: TableColumnData) => {
  if (column.prop == 'opera') {
    return 130;
  } else if (column.type == 'selection') {
    return 60;
  }
  return column.width;
};
// 动态计算headerCell
const getHeaderCellClass = ({ column }: { column: TableColumnData }) => {
  return [
    'cx-table-header-cell',
    `${column.children ? 'cx-table-header-has-children' : ''}`,
    ` ${column.resizable ? 'cx-table-header-resizable' : ''}`,
  ]
    .map((item) => item)
    .join(' ');
};
// 处理排序
const handleSortChange = (field: string) => {
  emits('sort-change', field);
};
// 处理拖拽
const handleHeaderDragend = async (
  newWidth: number,
  _oldWidth: number,
  column: TableColumnData,
  _e: Event,
) => {
  const minWidth = +(column.minWidth || column.width || 120);
  // 限制最小宽度
  if (newWidth <= minWidth) {
    column.width = minWidth;
  }
};
// 处理选择
const handleSelect = (v: Record<string, any>[]) => {
  const values = [
    ...new Set(
      v.map((item) => {
        return item[rowKey.value as string];
      }),
    ),
  ];
  isSelectChange = true;
  computedSelectKeys.value = values;
};
// 双向设置row
watch(
  () => computedSelectKeys.value.length,
  async () => {
    if (isSelectChange) {
      return (isSelectChange = false);
    }
    computedSelectKeys.value.forEach((item: string) => {
      tableRef.value?.toggleRowSelection(dataMap.value[item], true);
    });
  },
);
defineExpose({
  getRef() {
    return tableRef.value;
  },
});
</script>

<style lang="less">
@import './index.less';
</style>
