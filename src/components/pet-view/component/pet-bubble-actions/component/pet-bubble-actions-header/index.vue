<template>
  <div class="pet-bubble-actions-header">
    <img
      class="pet-bubble-actions-header-avatar"
      :src="iconSource"
      :alt="title"
    />
    <span class="pet-bubble-actions-header-heading">
      <span class="pet-bubble-actions-header-title">{{ title }}</span>
      <span class="pet-bubble-actions-header-description">
        安全、彻底地清理文件
      </span>
    </span>
    <span class="pet-bubble-actions-header-tools">
      <a-tooltip
        v-for="item in PET_HEADER_ACTION_OPTIONS"
        :key="item.key"
        :content="item.title"
        position="top"
      >
        <button
          class="pet-bubble-actions-header-button"
          type="button"
          :title="item.title"
          :aria-label="item.title"
          @click="handleSelect(item.key)"
        >
          <svg-icon
            class="pet-bubble-actions-header-icon"
            :name="item.icon"
          />
        </button>
      </a-tooltip>
    </span>
  </div>
</template>
<script setup lang="ts">
import { PetHeaderActionKey } from '../../type';
import { PET_HEADER_ACTION_OPTIONS } from '../../constants';
// 定义操作面板头部展示的品牌信息。
defineProps<{ title: string; iconSource: string }>();
// 定义用户选择头部快捷操作时向父组件发送的事件。
const emit = defineEmits<{ select: [key: PetHeaderActionKey] }>();
// 将用户选择的头部快捷操作通知给父组件。
function handleSelect(key: PetHeaderActionKey): void {
  emit('select', key);
}
</script>
<style lang="less" scoped>
.pet-bubble-actions-header {
  margin-bottom: 14px;
  padding: 2px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
  .pet-bubble-actions-header-avatar {
    height: 48px;
    width: 48px;
    padding: 4px;
    background: linear-gradient(145deg, #f3f8ff, #e8f1ff);
    border: 1px solid rgba(36, 117, 220, 0.16);
    border-radius: 15px;
    box-shadow: 0 5px 14px rgba(38, 91, 163, 0.12);
    object-fit: cover;
    flex-shrink: 0;
  }
  .pet-bubble-actions-header-heading {
    overflow: hidden;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    .pet-bubble-actions-header-title {
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
      letter-spacing: 0;
      color: #151a21;
    }
    .pet-bubble-actions-header-description {
      font-size: 12px;
      line-height: 18px;
      color: #7d8794;
    }
  }
  .pet-bubble-actions-header-tools {
    flex-shrink: 0;
    display: flex;
    gap: 8px;
    .pet-bubble-actions-header-button {
      cursor: pointer;
      height: 34px;
      width: 34px;
      padding: 0;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(121, 130, 143, 0.16);
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(30, 55, 90, 0.08);
      font-size: 18px;
      color: #68727f;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition:
        background 0.18s ease,
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        color 0.18s ease,
        transform 0.18s ease;
      .pet-bubble-actions-header-icon {
        height: 19px;
        width: 19px;
      }
      &:hover {
        background: #f1f6fd;
        border-color: rgba(36, 117, 220, 0.3);
        box-shadow: 0 5px 14px rgba(55, 108, 184, 0.12);
        color: #2475dc;
        transform: translateY(-1px);
      }
      &:focus-visible {
        outline: 2px solid rgba(36, 117, 220, 0.28);
        outline-offset: 2px;
      }
    }
  }
}
</style>
