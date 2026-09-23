<template>
  <demo-section
    class="section-element"
    title="Element Plus 表单类"
    description="arco.less 同时重置的 Element Plus 组件：勾选框、滚动条与数字输入框"
  >
    <demo-case
      title="el-checkbox"
      description="勾选框图标替换为 14px 业务图标，选中态、半选态与禁用态均使用独立图标"
    >
      <demo-item label="基础">
        <el-checkbox v-model="elementCheckbox">已启用</el-checkbox>
        <el-checkbox :model-value="false">未启用</el-checkbox>
        <el-checkbox
          :model-value="true"
          :indeterminate="true"
        >
          半选
        </el-checkbox>
      </demo-item>
      <demo-item label="禁用">
        <el-checkbox
          :model-value="false"
          disabled
        >
          未启用
        </el-checkbox>
        <el-checkbox
          :model-value="true"
          disabled
        >
          已启用
        </el-checkbox>
        <el-checkbox
          :model-value="true"
          :indeterminate="true"
          disabled
        >
          半选
        </el-checkbox>
      </demo-item>
      <demo-item label="全选联动">
        <el-checkbox
          v-model="checkAllTargets"
          :indeterminate="isTargetIndeterminate"
          @change="handleCheckAllTargets"
        >
          全选
        </el-checkbox>
        <el-checkbox-group
          v-model="checkedTargets"
          @change="handleCheckedTargets"
        >
          <el-checkbox
            v-for="target in targetOptions"
            :key="target"
            :value="target"
          >
            {{ target }}
          </el-checkbox>
        </el-checkbox-group>
      </demo-item>
    </demo-case>
    <demo-case
      title="el-scrollbar"
      description="滚动条滑块底色 #e1e5eb，悬浮加深为 #c9ced6，滑动时始终可见"
    >
      <demo-item
        label="垂直滚动"
        align="top"
      >
        <el-scrollbar height="180px">
          <div
            v-for="item in scrollItems"
            :key="item"
            class="section-element-line"
          >
            {{ item }}
          </div>
        </el-scrollbar>
      </demo-item>
    </demo-case>
    <demo-case
      title="el-input-number"
      description="数字输入框复用 8px 圆角与主题色描边，禁用底色为 #f5f7fa，数字左对齐"
    >
      <demo-item label="基础">
        <el-input-number
          v-model="passCount"
          :min="0"
          :max="35"
          :step="1"
        />
      </demo-item>
      <demo-item label="固定步进">
        <el-input-number
          v-model="passCount"
          :min="0"
          :max="35"
          :step="3"
          step-strictly
        />
      </demo-item>
      <demo-item label="禁用">
        <el-input-number
          :model-value="3"
          disabled
        />
      </demo-item>
      <demo-item label="按钮位置">
        <el-input-number
          v-model="passCount"
          controls-position="right"
        />
      </demo-item>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionElement',
});
// 保存 Element Plus 勾选框选中状态。
const elementCheckbox = ref(true);
// 提供全选联动演示的目标列表。
const targetOptions = ['安装包.dmg', '项目缓存', '临时日志.log'];
// 保存全选联动当前勾选的目标。
const checkedTargets = ref<string[]>(['安装包.dmg']);
// 保存全选勾选框状态。
const checkAllTargets = ref(false);
// 标识全选勾选框是否处于半选态。
const isTargetIndeterminate = ref(true);
// 保存数字输入框演示数值。
const passCount = ref(3);
// 提供滚动条演示使用的长列表数据。
const scrollItems = Array.from(
  { length: 20 },
  (_, index) => `待清理目标 ${String(index + 1).padStart(2, '0')}`,
);
// 切换全选状态并同步全部目标勾选结果。
function handleCheckAllTargets(value: boolean | string | number): void {
  const isCheckedAll = value === true;
  checkedTargets.value = isCheckedAll ? [...targetOptions] : [];
  isTargetIndeterminate.value = false;
  checkAllTargets.value = isCheckedAll;
}
// 按当前勾选数量同步全选勾选框的选中与半选状态。
function handleCheckedTargets(value: unknown): void {
  const checkedCount = (value as string[]).length;
  checkAllTargets.value = checkedCount === targetOptions.length;
  isTargetIndeterminate.value =
    checkedCount > 0 && checkedCount < targetOptions.length;
}
</script>
<style lang="less" scoped>
.section-element {
  .section-element-line {
    height: 32px;
    color: #474f59;
    font-size: 13px;
    line-height: 32px;
  }
}
</style>
