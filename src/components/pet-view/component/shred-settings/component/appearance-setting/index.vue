<template>
  <settings-card
    class="appearance-setting"
    title="外观设置"
    description="调整桌宠形象、大小与操作气泡的展示位置"
  >
    <div
      class="appearance-setting-workspace"
      :style="workspaceStyle"
    >
      <div
        class="appearance-setting-preview"
        aria-label="桌宠与操作气泡实时预览"
      >
        <div
          ref="previewStageElement"
          class="appearance-setting-stage"
          :style="previewSceneStyle"
        >
          <div class="appearance-setting-frame">
            <div class="appearance-setting-scene">
              <div class="appearance-setting-bubble">
                <div class="appearance-setting-header">
                  <img
                    class="appearance-setting-app-icon"
                    :src="appIconSource"
                    :alt="APP_NAME"
                  />
                  <span class="appearance-setting-header-info">
                    <span class="appearance-setting-app-title">
                      {{ APP_NAME }}
                    </span>
                    <span class="appearance-setting-app-desc">
                      安全、彻底地清理文件
                    </span>
                  </span>
                  <svg-icon
                    class="appearance-setting-history"
                    name="app-history"
                  />
                </div>
                <div class="appearance-setting-actions">
                  <span
                    v-for="item in PET_ACTION_OPTIONS"
                    :key="item.key"
                    class="appearance-setting-action"
                    :class="`appearance-setting-action-${item.tone}`"
                  >
                    <span class="appearance-setting-action-icon">
                      <svg-icon :name="item.icon" />
                    </span>
                    <span class="appearance-setting-action-info">
                      <span class="appearance-setting-action-meta">
                        <span class="appearance-setting-action-name">
                          {{ item.title }}
                        </span>
                        <span class="appearance-setting-action-tag">
                          {{ item.badge }}
                        </span>
                      </span>
                      <span class="appearance-setting-action-desc">
                        {{ item.description }}
                      </span>
                    </span>
                    <svg-icon
                      class="appearance-setting-action-next"
                      name="app-arrow-right"
                    />
                  </span>
                </div>
                <div class="appearance-setting-tip">
                  <span class="appearance-setting-tip-badge">
                    <svg-icon
                      class="appearance-setting-tip-icon"
                      name="app-heart"
                    />
                  </span>
                  <span class="appearance-setting-tip-text">
                    小贴士：文件或文件夹也可以直接拖到我身上。
                  </span>
                </div>
              </div>
              <span class="appearance-setting-drag">
                <svg-icon name="app-drag" />
              </span>
              <img
                class="appearance-setting-pet"
                :src="petImageSource"
                alt="桌宠实时预览"
                @load="handlePreviewPetLoad"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="appearance-setting-content">
        <settings-layout-row title="桌宠形象">
          <div
            class="appearance-setting-image-item appearance-setting-image-pet"
          >
            <span class="appearance-setting-image-view">
              <img
                class="appearance-setting-image"
                :src="petImageSource"
                alt="桌宠形象"
              />
            </span>
            <div class="appearance-setting-image-tools">
              <button
                class="appearance-setting-image-tool"
                type="button"
                title="更换桌宠形象"
                aria-label="更换桌宠形象"
                :disabled="isChoosingPetImage || isRestoringPetImage"
                @click.stop="emit('choose-pet-image')"
              >
                <svg-icon name="app-edit" />
              </button>
              <button
                v-if="isCustomPetImage"
                class="appearance-setting-image-tool"
                type="button"
                title="恢复默认桌宠形象"
                aria-label="恢复默认桌宠形象"
                :disabled="isChoosingPetImage || isRestoringPetImage"
                @click.stop="emit('restore-default-pet-image')"
              >
                <svg-icon name="app-restore" />
              </button>
            </div>
          </div>
        </settings-layout-row>
        <settings-layout-row
          tag="label"
          title="桌宠大小"
        >
          <a-input-number
            :model-value="petSize"
            :min="PET_SIZE_MIN"
            :max="PET_SIZE_MAX"
            :step="PET_SIZE_STEP"
            hide-button
            class="appearance-setting-size-input"
            @change="updatePetSize"
          >
            <template #suffix>
              <span class="appearance-setting-size-unit">px</span>
            </template>
          </a-input-number>
        </settings-layout-row>
        <settings-layout-row title="气泡方向">
          <a-radio-group
            :model-value="bubbleDirection"
            :options="BUBBLE_DIRECTION_OPTIONS"
            type="button"
            @change="updateBubbleDirection"
          >
            <template #label="{ data }">
              <span class="appearance-setting-direction">
                <svg-icon
                  :name="data.icon"
                  :size="14"
                />
                {{ data.label }}
              </span>
            </template>
          </a-radio-group>
        </settings-layout-row>
        <settings-layout-row title="气泡对齐">
          <a-radio-group
            :model-value="bubbleAlign"
            :options="BUBBLE_ALIGN_OPTIONS"
            type="button"
            @change="updateBubbleAlign"
          />
        </settings-layout-row>
      </div>
    </div>
  </settings-card>
</template>
<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { AppearanceSettingEmits, AppearanceSettingProps } from './type';
import appIconSource from '@/assets/app-icon.png';
import { APP_NAME } from '@/constants';
import { clamp } from '@/utils';
import {
  BUBBLE_ALIGN_OPTIONS,
  BUBBLE_DIRECTION_OPTIONS,
  PET_PREVIEW_BUBBLE_HEIGHT,
  PET_PREVIEW_BUBBLE_SCALE,
  PET_PREVIEW_BUBBLE_WIDTH,
  PET_PREVIEW_GAP,
  PET_PREVIEW_HEIGHT,
  PET_PREVIEW_PADDING,
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_STEP,
} from './constants';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/component/shred-actions/constants';
import { SettingsCard } from '../settings-card';
import { SettingsLayoutRow } from './component';
// 接收并实时呈现当前外观设置。
const props = defineProps<AppearanceSettingProps>();
// 向设置页上报外观编辑、形象替换与桌宠尺寸调整操作。
const emit = defineEmits<AppearanceSettingEmits>();
// 保存预览画布元素，以便计算当前可用显示范围。
const previewStageElement = ref<HTMLElement | null>(null);
// 保存预览画布实时可用宽高。
const previewStageSize = ref({ width: 0, height: 0 });
// 保存当前桌宠图片真实高宽比，用于还原人物显示尺寸。
const previewPetAspectRatio = ref(1);
// 把由设置页高度推算的预览面板高度交给样式表使用。
const workspaceStyle = {
  '--appearance-setting-preview-height': `${PET_PREVIEW_HEIGHT}px`,
};
// 根据真实场景尺寸、气泡方位与画布范围生成缩放后的预览尺寸。
const previewSceneStyle = computed(() => {
  // 计算桌宠在未缩放场景中的真实显示宽度。
  const petWidth = props.petSize;
  // 计算桌宠在未缩放场景中的真实显示高度。
  const petHeight = Math.round(petWidth * previewPetAspectRatio.value);
  // 汇总气泡、间距、桌宠和两侧留白后的完整场景宽度。
  const sceneWidth =
    PET_PREVIEW_PADDING * 2 +
    PET_PREVIEW_BUBBLE_WIDTH +
    PET_PREVIEW_GAP +
    petWidth;
  // 以气泡和桌宠中较高的一项确定内容区高度，对齐方式只改变两者的相对位置。
  const contentHeight = Math.max(PET_PREVIEW_BUBBLE_HEIGHT, petHeight);
  // 汇总内容区与四周留白后的完整场景高度。
  const sceneHeight = PET_PREVIEW_PADDING * 2 + contentHeight;
  // 标识气泡是否需要摆放在桌宠右侧。
  const isBubbleOnRight = props.bubbleDirection === 'right';
  // 计算气泡在场景中的横向起点。
  const bubbleLeft =
    PET_PREVIEW_PADDING + (isBubbleOnRight ? petWidth + PET_PREVIEW_GAP : 0);
  // 计算桌宠在场景中的横向起点。
  const petLeft =
    PET_PREVIEW_PADDING +
    (isBubbleOnRight ? 0 : PET_PREVIEW_BUBBLE_WIDTH + PET_PREVIEW_GAP);
  // 计算拖拽按钮在场景中的横向起点，气泡位于右侧时镜像到桌宠左上角。
  const dragHandleLeft = (isBubbleOnRight ? petLeft : petLeft + petWidth) - 18;
  // 按对齐方式计算气泡在场景中的纵向起点。
  const bubbleTop =
    PET_PREVIEW_PADDING +
    calculateAlignedOffset(PET_PREVIEW_BUBBLE_HEIGHT, contentHeight);
  // 按对齐方式计算桌宠在场景中的纵向起点。
  const petTop =
    PET_PREVIEW_PADDING + calculateAlignedOffset(petHeight, contentHeight);
  // 读取画布可用宽度，未完成首次布局时保留原始比例。
  const availableWidth = previewStageSize.value.width;
  // 读取画布可用高度，未完成首次布局时保留原始比例。
  const availableHeight = previewStageSize.value.height;
  // 求取完整场景在当前画布中不发生裁切的最大缩放比例，画布有余量时等比放大以充分展示预览。
  const scale =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight)
      : 1;
  // 计算缩放后占据画布的场景宽度。
  const frameWidth = Math.round(sceneWidth * scale);
  // 计算缩放后占据画布的场景高度。
  const frameHeight = Math.round(sceneHeight * scale);
  return {
    '--appearance-setting-preview-scale': `${scale}`,
    '--appearance-setting-preview-frame-width': `${frameWidth}px`,
    '--appearance-setting-preview-frame-height': `${frameHeight}px`,
    '--appearance-setting-preview-scene-width': `${sceneWidth}px`,
    '--appearance-setting-preview-scene-height': `${sceneHeight}px`,
    '--appearance-setting-preview-bubble-scale': `${PET_PREVIEW_BUBBLE_SCALE}`,
    '--appearance-setting-preview-bubble-left': `${bubbleLeft}px`,
    '--appearance-setting-preview-bubble-top': `${bubbleTop}px`,
    '--appearance-setting-preview-drag-left': `${dragHandleLeft}px`,
    '--appearance-setting-preview-pet-left': `${petLeft}px`,
    '--appearance-setting-preview-pet-width': `${petWidth}px`,
    '--appearance-setting-preview-pet-height': `${petHeight}px`,
    '--appearance-setting-preview-pet-top': `${petTop}px`,
  };
});
// 按当前对齐方式计算元素相对场景内容区顶部的偏移。
function calculateAlignedOffset(
  elementHeight: number,
  contentHeight: number,
): number {
  if (props.bubbleAlign === 'top') return 0;
  if (props.bubbleAlign === 'bottom') return contentHeight - elementHeight;
  return Math.round((contentHeight - elementHeight) / 2);
}
// 根据画布尺寸变化更新可用于预览缩放的边界。
function handlePreviewStageResize(entries: ResizeObserverEntry[]): void {
  if (!entries[0]) return;
  previewStageSize.value = {
    width: entries[0].contentRect.width,
    height: entries[0].contentRect.height,
  };
}
// 图片加载后同步桌宠真实高宽比，保证缩放与实际显示一致。
function handlePreviewPetLoad(event: Event): void {
  // 读取触发加载事件的桌宠图片元素。
  const image = event.currentTarget as HTMLImageElement;
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
  previewPetAspectRatio.value = image.naturalHeight / image.naturalWidth;
}
// 持续观察预览画布尺寸，使缩放系数适配当前可用空间。
useResizeObserver(previewStageElement, handlePreviewStageResize);
// 校验并上报用户选择的气泡方位。
function updateBubbleDirection(value: string | number | boolean): void {
  if (value === 'left' || value === 'right')
    emit('update-bubble-direction', value);
}
// 校验并上报用户选择的气泡对齐方式。
function updateBubbleAlign(value: string | number | boolean): void {
  if (value === 'top' || value === 'center' || value === 'bottom')
    emit('update-bubble-align', value);
}
// 校验并上报输入框提交的桌宠尺寸。
function updatePetSize(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  // 将用户输入限制在桌宠支持的尺寸区间内。
  const normalizedValue = clamp(Math.round(value), PET_SIZE_MIN, PET_SIZE_MAX);
  emit('update-pet-size', normalizedValue);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
