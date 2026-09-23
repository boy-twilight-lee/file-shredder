<template>
  <demo-section
    class="section-icons"
    title="图标总览"
    description="src/assets/icons、icon-source 与 icons-components 下的全部雪碧图图标，统一通过 svg-icon 以 symbol 名称引用，点击卡片可复制名称"
  >
    <template #extra>
      <span class="section-icons-count">
        共 {{ allIconNames.length }} 个 / 当前显示
        {{ visibleIconNames.length }} 个
      </span>
    </template>
    <div class="section-icons-toolbar">
      <a-input
        v-model="keyword"
        class="section-icons-search"
        placeholder="搜索图标名称，例如 arrow / close / page"
        allow-clear
      >
        <template #prefix>
          <svg-icon name="icon-search" />
        </template>
      </a-input>
      <a-radio-group
        v-model="iconSize"
        type="button"
        size="small"
      >
        <a-radio
          v-for="size in iconSizes"
          :key="size"
          :value="size"
        >
          {{ size }}
        </a-radio>
      </a-radio-group>
    </div>
    <div
      v-if="visibleIconNames.length"
      class="section-icons-grid"
    >
      <div
        v-for="name in visibleIconNames"
        :key="name"
        class="section-icons-cell"
        @click="handleCopyIconName(name)"
      >
        <svg-icon
          :name="name"
          :size="iconSize"
        />
        <span class="section-icons-name">{{ name }}</span>
      </div>
    </div>
    <div
      v-else
      class="section-icons-empty"
    >
      <cx-empty :description="`没有匹配「${keyword}」的图标`" />
    </div>
  </demo-section>
</template>
<script setup lang="ts">
import iconNames from 'virtual:svg-icons-names';
import { Message } from '@arco-design/web-vue';
import { CxEmpty } from '@/components';
import DemoSection from './demo-section.vue';
defineOptions({
  name: 'SectionIcons',
});
// 汇总雪碧图包含的全部图标名称并按字母排序，便于按前缀查找。
const allIconNames = [...iconNames].sort();
// 保存图标名称搜索关键字。
const keyword = ref('');
// 保存图标预览尺寸。
const iconSize = ref(24);
// 提供图标预览可选的尺寸档位。
const iconSizes = [16, 20, 24, 32];
// 按关键字过滤雪碧图中的图标名称。
const visibleIconNames = computed(() => {
  const trimmedKeyword = keyword.value.trim().toLowerCase();
  if (!trimmedKeyword) return allIconNames;
  return allIconNames.filter((name) =>
    name.toLowerCase().includes(trimmedKeyword),
  );
});
// 复制图标名称到剪贴板，供业务代码直接通过 svg-icon 引用。
async function handleCopyIconName(name: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(name);
    Message.success(`已复制 ${name}`);
  } catch {
    // 剪贴板不可用时保留名称展示，提示用户手动复制。
    Message.warning('当前环境不支持自动复制，请手动选择名称');
  }
}
</script>
<style lang="less" scoped>
.section-icons {
  .section-icons-count {
    margin-left: auto;
    color: #79828f;
    font-size: 12px;
  }
  .section-icons-toolbar {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    .section-icons-search {
      width: 320px;
    }
  }
  .section-icons-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .section-icons-cell {
    height: 84px;
    width: 104px;
    padding: 10px 4px;
    overflow: hidden;
    border: 1px solid #f2f5fa;
    border-radius: 8px;
    background: #fff;
    color: #474f59;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 8px;
    transition: all 0.1s;
    &:hover {
      border-color: #0065ff;
      background: rgba(0, 101, 255, 0.04);
      color: #0065ff;
    }
    .section-icons-name {
      width: 100%;
      overflow: hidden;
      font-size: 11px;
      line-height: 14px;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  .section-icons-empty {
    height: 240px;
  }
}
</style>
