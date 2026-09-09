<template>
  <button
    class="pet-bubble-action"
    :class="`pet-bubble-action-${item.tone}`"
    type="button"
    role="menuitem"
    @click="handleSelect"
  >
    <span class="pet-bubble-action-icon-wrap">
      <svg-icon
        :name="item.icon"
        class="pet-bubble-action-icon"
      />
    </span>
    <span class="pet-bubble-action-content">
      <span class="pet-bubble-action-heading">
        <span class="pet-bubble-action-title">{{ item.title }}</span>
        <span class="pet-bubble-action-badge">{{ item.badge }}</span>
      </span>
      <span class="pet-bubble-action-description">{{ item.description }}</span>
    </span>
    <svg-icon
      class="pet-bubble-action-chevron"
      name="app-arrow-right"
    />
  </button>
</template>
<script setup lang="ts">
import { PetActionOption } from '../../type';
// 定义当前操作项的展示信息。
const props = defineProps<{ item: PetActionOption }>();
// 定义用户选择操作项时向父组件发送的事件。
const emit = defineEmits<{ select: [key: PetActionOption['key']] }>();
// 将当前操作项标识通知给父组件统一处理。
function handleSelect(): void {
  emit('select', props.item.key);
}
</script>
<style lang="less" scoped>
.pet-bubble-action {
  cursor: pointer;
  min-height: 62px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #fbfdff 0%, #f3f7fd 100%);
  border: 1px solid rgba(36, 117, 220, 0.2);
  border-radius: 12px;
  font-family: inherit;
  text-align: left;
  color: #0d1014;
  display: flex;
  align-items: center;
  gap: 10px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
  .pet-bubble-action-tone(@color) {
    background: linear-gradient(
      135deg,
      mix(#fff, @color, 97%) 0%,
      mix(#fff, @color, 93%) 100%
    );
    border-color: fade(@color, 20%);
    &:hover {
      background: mix(#fff, @color, 90%);
      border-color: fade(@color, 42%);
      box-shadow: 0 5px 14px fade(@color, 15%);
    }
    .pet-bubble-action-icon-wrap {
      background: fade(@color, 12%);
      color: @color;
    }
    .pet-bubble-action-content {
      .pet-bubble-action-heading {
        .pet-bubble-action-badge {
          background: fade(@color, 9%);
          color: @color;
        }
      }
    }
    .pet-bubble-action-chevron {
      color: fade(@color, 72%);
    }
  }
  &:hover {
    background: #edf5ff;
    border-color: #b9d2f7;
    box-shadow: 0 5px 14px rgba(55, 108, 184, 0.1);
    transform: translateY(-1px);
  }
  &.pet-bubble-action-blue {
    .pet-bubble-action-tone(#2475dc);
  }
  &.pet-bubble-action-green {
    .pet-bubble-action-tone(#169c73);
  }
  &.pet-bubble-action-purple {
    .pet-bubble-action-tone(#7a5af8);
  }
  &.pet-bubble-action-red {
    .pet-bubble-action-tone(#e5484d);
  }
  .pet-bubble-action-icon-wrap {
    height: 42px;
    width: 42px;
    background: rgba(36, 117, 220, 0.1);
    border-radius: 12px;
    color: #2475dc;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    .pet-bubble-action-icon {
      height: 23px;
      width: 23px;
    }
  }
  .pet-bubble-action-content {
    overflow: hidden;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 3px;
    .pet-bubble-action-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      .pet-bubble-action-title {
        overflow: hidden;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pet-bubble-action-badge {
        height: 20px;
        padding: 0 6px;
        border-radius: 6px;
        font-size: 10px;
        line-height: 16px;
        white-space: nowrap;
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
      }
    }
    .pet-bubble-action-description {
      overflow: hidden;
      font-size: 12px;
      line-height: 18px;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #79828f;
    }
  }
  .pet-bubble-action-chevron {
    font-size: 16px;
    flex-shrink: 0;
  }
}
</style>
