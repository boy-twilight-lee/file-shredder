<template>
  <demo-section
    class="section-arco-form"
    title="Arco 表单类"
    description="arco.less 重置的输入、选择、日期与表单组件，含禁用、错误、尺寸等状态表现"
  >
    <demo-case
      title="checkbox"
      description="勾选框图标替换为 14px 业务图标，选中态标签文字使用主题色"
    >
      <demo-item label="基础">
        <a-checkbox v-model="checkboxValue">已启用</a-checkbox>
        <a-checkbox :model-value="false">未启用</a-checkbox>
        <a-checkbox
          :model-value="true"
          :indeterminate="true"
        >
          半选
        </a-checkbox>
      </demo-item>
      <demo-item label="禁用">
        <a-checkbox
          :model-value="false"
          disabled
        >
          未启用
        </a-checkbox>
        <a-checkbox
          :model-value="true"
          disabled
        >
          已启用
        </a-checkbox>
        <a-checkbox
          :model-value="true"
          :indeterminate="true"
          disabled
        >
          半选
        </a-checkbox>
      </demo-item>
      <demo-item label="复选框组">
        <a-checkbox-group v-model="checkboxGroup">
          <a-checkbox value="file">文件</a-checkbox>
          <a-checkbox value="folder">文件夹</a-checkbox>
          <a-checkbox value="record">清理记录</a-checkbox>
        </a-checkbox-group>
      </demo-item>
    </demo-case>
    <demo-case
      title="radio"
      description="单选框图标替换为 14px 业务图标，按钮组切换项使用 6px 内圆角"
    >
      <demo-item label="基础">
        <a-radio-group v-model="radioValue">
          <a-radio value="quick">极速</a-radio>
          <a-radio value="daily">日常</a-radio>
          <a-radio value="deep">深度</a-radio>
        </a-radio-group>
      </demo-item>
      <demo-item label="禁用">
        <a-radio-group
          :model-value="'daily'"
          disabled
        >
          <a-radio value="quick">极速</a-radio>
          <a-radio value="daily">日常</a-radio>
        </a-radio-group>
      </demo-item>
      <demo-item label="按钮组">
        <a-radio-group
          v-model="radioButtonValue"
          type="button"
        >
          <a-radio value="file">按文件</a-radio>
          <a-radio value="folder">按文件夹</a-radio>
          <a-radio value="path">按路径</a-radio>
        </a-radio-group>
      </demo-item>
    </demo-case>
    <demo-case title="switch" description="开关底色与滑块颜色按主题重写，选中禁用态使用浅主题色">
      <demo-item label="基础">
        <a-switch v-model="switchValue" />
      </demo-item>
      <demo-item label="状态">
        <a-switch :model-value="true" />
        <a-switch :model-value="false" />
        <a-switch
          :model-value="true"
          disabled
        />
        <a-switch
          :model-value="false"
          disabled
        />
      </demo-item>
      <demo-item label="带文字">
        <a-switch
          v-model="switchTextValue"
          checked-text="开"
          unchecked-text="关"
        />
      </demo-item>
    </demo-case>
    <demo-case
      title="input"
      description="输入框统一 8px 圆角与边框，悬浮与聚焦时使用主题色描边和 2px 光晕"
    >
      <demo-item label="基础">
        <a-input
          v-model="inputValue"
          class="section-arco-form-field"
          placeholder="请输入目标路径"
        />
      </demo-item>
      <demo-item label="前后缀与清除">
        <a-input
          v-model="inputValue"
          class="section-arco-form-field"
          placeholder="请输入关键字"
          allow-clear
        >
          <template #prefix><svg-icon name="icon-search" /></template>
          <template #suffix><svg-icon name="icon-info" /></template>
        </a-input>
      </demo-item>
      <demo-item label="字数限制">
        <a-input
          v-model="inputValue"
          class="section-arco-form-field"
          :max-length="20"
          show-word-limit
          placeholder="最多 20 个字符"
        />
      </demo-item>
      <demo-item label="禁用与只读">
        <a-input
          class="section-arco-form-field"
          model-value="禁用状态"
          disabled
        />
        <a-input
          class="section-arco-form-field"
          model-value="只读状态"
          readonly
        />
      </demo-item>
      <demo-item label="错误态">
        <a-input
          class="section-arco-form-field"
          model-value="错误状态"
          error
        />
      </demo-item>
      <demo-item label="尺寸">
        <a-input
          class="section-arco-form-field"
          model-value="小尺寸"
          size="small"
        />
        <a-input
          class="section-arco-form-field"
          model-value="默认尺寸"
        />
      </demo-item>
    </demo-case>
    <demo-case title="textarea" description="多行输入框共享输入框的圆角、描边与光晕，内部留白为 6px 9px">
      <demo-item label="基础">
        <a-textarea
          v-model="textareaValue"
          class="section-arco-form-field"
          placeholder="补充清理说明"
          :auto-size="{ minRows: 3, maxRows: 4 }"
        />
      </demo-item>
      <demo-item label="可清除与字数">
        <a-textarea
          v-model="textareaValue"
          class="section-arco-form-field"
          allow-clear
          :max-length="50"
          show-word-limit
          placeholder="最多 50 个字符"
        />
      </demo-item>
      <demo-item label="禁用">
        <a-textarea
          class="section-arco-form-field"
          model-value="禁用状态"
          disabled
        />
      </demo-item>
    </demo-case>
    <demo-case
      title="select"
      description="选择器与下拉列表统一 8px 圆角，选项悬浮底色为 #edf1f7，选中项使用主题色底与文字"
    >
      <demo-item label="基础">
        <a-select
          v-model="selectValue"
          class="section-arco-form-field"
          placeholder="请选择清理级别"
          :options="passesOptions"
          allow-clear
        />
      </demo-item>
      <demo-item label="多选标签">
        <a-select
          v-model="selectMultipleValue"
          class="section-arco-form-field"
          placeholder="请选择清理范围"
          :options="scopeOptions"
          multiple
          :max-tag-count="2"
        />
      </demo-item>
      <demo-item label="可搜索">
        <a-select
          v-model="selectValue"
          class="section-arco-form-field"
          placeholder="搜索清理级别"
          :options="passesOptions"
          allow-search
        />
      </demo-item>
      <demo-item label="禁用与错误">
        <a-select
          class="section-arco-form-field"
          model-value="daily"
          :options="passesOptions"
          disabled
        />
        <a-select
          class="section-arco-form-field"
          model-value="daily"
          :options="passesOptions"
          error
        />
      </demo-item>
    </demo-case>
    <demo-case
      title="cascader"
      description="级联面板高度固定为 180px，选项 6px 圆角，选中项使用主题色底与文字"
    >
      <demo-item label="基础">
        <a-cascader
          v-model="cascaderValue"
          class="section-arco-form-field"
          placeholder="请选择清理目录"
          :options="directoryOptions"
          allow-clear
        />
      </demo-item>
      <demo-item label="可搜索">
        <a-cascader
          v-model="cascaderValue"
          class="section-arco-form-field"
          placeholder="搜索清理目录"
          :options="directoryOptions"
          allow-search
        />
      </demo-item>
      <demo-item label="禁用">
        <a-cascader
          class="section-arco-form-field"
          placeholder="禁用状态"
          :options="directoryOptions"
          disabled
        />
      </demo-item>
    </demo-case>
    <demo-case
      title="date-picker"
      description="日期面板 308px 高，今天使用主题色描边，选中日期使用主题色实底"
    >
      <demo-item label="日期">
        <a-date-picker
          v-model="dateValue"
          class="section-arco-form-field"
          placeholder="选择执行日期"
        />
      </demo-item>
      <demo-item label="日期时间">
        <a-date-picker
          v-model="dateTimeValue"
          class="section-arco-form-field"
          placeholder="选择执行时间"
          format="YYYY-MM-DD HH:mm"
          show-time
        />
      </demo-item>
      <demo-item label="禁用">
        <a-date-picker
          class="section-arco-form-field"
          placeholder="禁用状态"
          disabled
        />
      </demo-item>
    </demo-case>
    <demo-case
      title="form"
      description="表单项最小高度 32px，必填星号 8px 宽主题错误色，错误文案为 14px 错误色"
    >
      <a-form
        ref="formRef"
        :model="formModel"
        layout="vertical"
        class="section-arco-form-form"
      >
        <a-form-item
          field="passes"
          label="清理级别"
          required
        >
          <a-select
            v-model="formModel.passes"
            placeholder="请选择清理级别"
            :options="passesOptions"
          />
        </a-form-item>
        <a-form-item
          field="remark"
          label="清理备注"
          required
        >
          <div class="section-arco-form-prefix">
            <span class="form-prefix-text">记录</span>
            <a-input
              v-model="formModel.remark"
              placeholder="请输入清理备注"
            />
          </div>
        </a-form-item>
        <a-form-item
          field="notify"
          label="完成通知"
        >
          <a-switch v-model="formModel.notify" />
        </a-form-item>
        <a-form-item>
          <a-button
            type="primary"
            @click="handleValidateForm"
          >
            校验表单
          </a-button>
          <a-button @click="handleResetForm">重置表单</a-button>
        </a-form-item>
      </a-form>
    </demo-case>
  </demo-section>
</template>
<script setup lang="ts">
import { FormInstance } from '@arco-design/web-vue';
import DemoCase from './demo-case.vue';
import DemoItem from './demo-item.vue';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionArcoForm',
});
// 保存复选框选中状态。
const checkboxValue = ref(true);
// 保存复选框组选中值。
const checkboxGroup = ref<string[]>(['file']);
// 保存单选组选中值。
const radioValue = ref('daily');
// 保存单选按钮组选中值。
const radioButtonValue = ref('file');
// 保存开关选中状态。
const switchValue = ref(true);
// 保存带文字开关的选中状态。
const switchTextValue = ref(false);
// 保存单行输入框示例内容。
const inputValue = ref('D:\\临时目录');
// 保存多行输入框示例内容。
const textareaValue = ref('');
// 保存选择器选中值。
const selectValue = ref('daily');
// 保存多选选择器选中值。
const selectMultipleValue = ref<string[]>(['file', 'folder']);
// 保存级联选择器选中值。
const cascaderValue = ref('cache-browser');
// 保存日期选择器选中值。
const dateValue = ref('2026-09-23');
// 保存日期时间选择器选中值。
const dateTimeValue = ref('2026-09-23 10:24');
// 提供清理级别下拉数据。
const passesOptions = [
  { label: '极速删除（不覆写）', value: 'quick' },
  { label: '日常清理（3 次覆写）', value: 'daily' },
  { label: '加强清理（7 次覆写）', value: 'deep' },
  { label: '深度清理（35 次覆写）', value: 'secure' },
];
// 提供清理范围多选数据。
const scopeOptions = [
  { label: '普通文件', value: 'file' },
  { label: '文件夹', value: 'folder' },
  { label: '缓存目录', value: 'cache' },
  { label: '清理记录', value: 'record' },
];
// 提供清理目录级联数据。
const directoryOptions = [
  {
    value: 'cache',
    label: '缓存目录',
    children: [
      { value: 'cache-browser', label: '浏览器缓存' },
      { value: 'cache-build', label: '构建产物' },
    ],
  },
  {
    value: 'temp',
    label: '临时目录',
    children: [
      { value: 'temp-os', label: '系统临时文件' },
      { value: 'temp-log', label: '运行日志' },
    ],
  },
];
// 汇总表单演示使用的字段数据。
const formModel = reactive({
  passes: '',
  remark: '',
  notify: true,
});
// 保存表单实例以调用内置校验方法。
const formRef = ref<FormInstance>();
// 触发表单校验以展示错误文案样式。
async function handleValidateForm(): Promise<void> {
  await formRef.value?.validate();
}
// 重置表单字段与校验状态。
function handleResetForm(): void {
  formRef.value?.resetFields();
}
onMounted(async () => {
  // 首次渲染即触发一次校验，让必填错误文案样式在 demo 中直接可见。
  await formRef.value?.validate();
});
</script>
<style lang="less" scoped>
.section-arco-form {
  .section-arco-form-field {
    width: 240px;
  }
  .section-arco-form-form {
    max-width: 520px;
  }
  .section-arco-form-prefix {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
  }
}
</style>
