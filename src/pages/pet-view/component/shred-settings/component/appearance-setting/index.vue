<template>
  <cx-card
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
        >
          <div
            class="appearance-setting-scene"
            :style="previewSceneStyle"
          >
            <div class="appearance-setting-bubble">
              <pet-bubble-actions
                ref="previewActionsElement"
                :scale="previewScale"
              />
            </div>
            <pet-character
              :scale="previewScale"
              :drag-button-visible="false"
            />
          </div>
        </div>
      </div>
      <div class="appearance-setting-content">
        <cx-layout title="桌宠形象">
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
                @click.stop="choosePetImage"
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
                @click.stop="restoreDefaultPetImage"
              >
                <svg-icon name="app-restore" />
              </button>
            </div>
          </div>
        </cx-layout>
        <cx-layout
          tag="label"
          title="桌宠大小"
        >
          <a-input-number
            :model-value="settings.petSize"
            :min="PET_SIZE_MIN"
            :max="PET_SIZE_MAX"
            :step="PET_SIZE_STEP"
            hide-button
            class="appearance-setting-size-input"
            @change="handlePetSizeChange"
          >
            <template #suffix>
              <span class="appearance-setting-size-unit">px</span>
            </template>
          </a-input-number>
        </cx-layout>
        <cx-layout title="气泡方向">
          <a-radio-group
            :model-value="settings.bubbleDirection"
            :options="BUBBLE_DIRECTION_OPTIONS"
            class="appearance-setting-option-group"
            type="button"
            @change="handleBubbleDirectionChange"
          >
            <template #label="{ data }">
              <svg-icon
                :name="data.icon"
                :size="16"
              />
            </template>
          </a-radio-group>
        </cx-layout>
        <cx-layout title="气泡对齐">
          <a-radio-group
            :model-value="settings.bubbleAlign"
            :options="BUBBLE_ALIGN_OPTIONS"
            class="appearance-setting-option-group"
            type="button"
            @change="handleBubbleAlignChange"
          >
            <template #label="{ data }">
              <svg-icon
                :name="data.icon"
                :size="16"
              />
            </template>
          </a-radio-group>
        </cx-layout>
      </div>
    </div>
  </cx-card>
</template>
<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { clamp } from '@/utils';
import { PET_BUBBLE_GAP, PET_WINDOW_PADDING } from '@/constants';
import {
  BUBBLE_ALIGN_OPTIONS,
  BUBBLE_DIRECTION_OPTIONS,
  PET_PREVIEW_BUBBLE_BORDER,
  PET_PREVIEW_BUBBLE_RADIUS,
  PET_PREVIEW_HEIGHT,
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_STEP,
} from '../../constants';
import { useShredSettingsContext } from '../../hooks';
import { PetBubbleActions, PetCharacter } from '@/pages/pet-view/component';
import { usePetViewContext } from '@/pages/pet-view/hooks';
import CxCard from '@/components/cx-card';
import CxLayout from '@/components/cx-layout';
// 读取设置页共享的外观状态与保存操作。
const {
  settings,
  petImageSource,
  isCustomPetImage,
  isChoosingPetImage,
  isRestoringPetImage,
  choosePetImage,
  restoreDefaultPetImage,
  updatePetSize,
  updateBubbleDirection,
  updateBubbleAlign,
} = useShredSettingsContext().inject();
// 读取桌宠形象高宽比，用于还原人物在预览中的真实显示尺寸。
const { petAspectRatio } = usePetViewContext().inject();
// 保存预览画布元素，以便按可用空间换算缩放系数。
const previewStageElement = ref<HTMLElement | null>(null);
// 保存操作气泡组件实例，用于读取气泡真实尺寸。
const previewActionsElement = ref<InstanceType<typeof PetBubbleActions> | null>(
  null,
);
// 保存预览画布实时可用宽高。
const previewStageSize = ref({ width: 0, height: 0 });
// 保存操作气泡在未缩放状态下的真实外框尺寸。
const previewBubbleSize = ref({ width: 0, height: 0 });
// 把由设置页高度推算的预览面板高度交给样式表使用。
const workspaceStyle = {
  '--appearance-setting-preview-height': `${PET_PREVIEW_HEIGHT}px`,
};
// 汇总预览场景在未缩放状态下的尺寸与坐标，与主进程窗口布局保持一致。
const previewMetrics = computed(() => {
  // 计算桌宠在场景中的真实显示宽度。
  const petWidth = settings.value.petSize;
  // 按形象高宽比换算桌宠真实显示高度。
  const petHeight = Math.max(1, Math.round(petWidth * petAspectRatio.value));
  // 汇总气泡内容与描边后的真实外框尺寸。
  const bubbleWidth =
    previewBubbleSize.value.width + PET_PREVIEW_BUBBLE_BORDER * 2;
  const bubbleHeight =
    previewBubbleSize.value.height + PET_PREVIEW_BUBBLE_BORDER * 2;
  // 以气泡与桌宠中较高的一项确定内容区高度，对齐方式只改变两者的相对位置。
  const contentHeight = Math.max(bubbleHeight, petHeight);
  // 汇总气泡、间距、桌宠与两侧留白后的完整场景尺寸。
  const sceneWidth =
    PET_WINDOW_PADDING * 2 + PET_BUBBLE_GAP + bubbleWidth + petWidth;
  const sceneHeight = PET_WINDOW_PADDING * 2 + contentHeight;
  // 计算桌宠贴向气泡反方向一侧的横向起点。
  const petLeft =
    settings.value.bubbleDirection === 'right'
      ? PET_WINDOW_PADDING
      : sceneWidth - PET_WINDOW_PADDING - petWidth;
  // 先按对齐方式定位桌宠，再让气泡以桌宠为基准纵向对齐。
  const petTop =
    PET_WINDOW_PADDING + calculateAlignedOffset(petHeight, contentHeight);
  const bubbleTop = petTop + calculateAlignedOffset(bubbleHeight, petHeight);
  // 气泡按方位贴在桌宠一侧。
  const bubbleLeft =
    settings.value.bubbleDirection === 'right'
      ? petLeft + petWidth + PET_BUBBLE_GAP
      : petLeft - PET_BUBBLE_GAP - bubbleWidth;
  return {
    petWidth,
    petHeight,
    bubbleWidth,
    bubbleHeight,
    sceneWidth,
    sceneHeight,
    bubbleLeft,
    bubbleTop,
  };
});
// 求取完整场景不发生裁切的最大缩放系数，画布有余量时等比放大以充分展示预览。
const previewScale = computed(() => {
  // 画布或气泡尺寸尚未就绪时先按真实尺寸展示。
  if (
    previewStageSize.value.width <= 0 ||
    previewStageSize.value.height <= 0 ||
    previewBubbleSize.value.width <= 0
  )
    return 1;
  return Math.min(
    previewStageSize.value.width / previewMetrics.value.sceneWidth,
    previewStageSize.value.height / previewMetrics.value.sceneHeight,
  );
});
// 生成场景、气泡与桌宠按缩放系数换算后的样式变量。
const previewSceneStyle = computed<Record<string, string>>(() => {
  // 读取未缩放场景尺寸与当前缩放系数。
  const {
    petWidth,
    petHeight,
    bubbleWidth,
    bubbleHeight,
    sceneWidth,
    sceneHeight,
    bubbleLeft,
    bubbleTop,
  } = previewMetrics.value;
  const scale = previewScale.value;
  return {
    '--appearance-setting-preview-scale': `${scale}`,
    '--appearance-setting-preview-scene-height': `${Math.round(sceneHeight * scale)}px`,
    '--appearance-setting-preview-scene-width': `${Math.round(sceneWidth * scale)}px`,
    '--appearance-setting-preview-bubble-height': `${Math.round(bubbleHeight * scale)}px`,
    '--appearance-setting-preview-bubble-width': `${Math.round(bubbleWidth * scale)}px`,
    '--appearance-setting-preview-bubble-top': `${Math.round(bubbleTop * scale)}px`,
    '--appearance-setting-preview-bubble-left': `${Math.round(bubbleLeft * scale)}px`,
    '--appearance-setting-preview-bubble-radius': `${Math.round(PET_PREVIEW_BUBBLE_RADIUS * scale)}px`,
    // 桌宠由组件内部按缩放系数换算，这里只提供基准尺寸与窗口留白。
    '--pet-width': `${petWidth}px`,
    '--pet-height': `${petHeight}px`,
    '--pet-window-padding': `${Math.round(PET_WINDOW_PADDING * scale)}px`,
  };
});
// 按当前对齐方式计算元素相对参照区域顶部的偏移。
function calculateAlignedOffset(
  elementHeight: number,
  referenceHeight: number,
): number {
  if (settings.value.bubbleAlign === 'top') return 0;
  if (settings.value.bubbleAlign === 'bottom')
    return referenceHeight - elementHeight;
  return Math.round((referenceHeight - elementHeight) / 2);
}
// 观察操作气泡尺寸变化，字体与图标就绪后自动校准预览比例。
function handleActionsResize(entries: ResizeObserverEntry[]): void {
  const target = entries[0]?.target;
  if (!(target instanceof HTMLElement)) return;
  previewBubbleSize.value = {
    width: target.offsetWidth,
    height: target.offsetHeight,
  };
}
// 根据画布尺寸变化更新可用于预览缩放的边界。
function handlePreviewStageResize(entries: ResizeObserverEntry[]): void {
  if (!entries[0]) return;
  previewStageSize.value = {
    width: entries[0].contentRect.width,
    height: entries[0].contentRect.height,
  };
}
// 持续观察预览画布与操作气泡尺寸，使缩放系数适配当前可用空间。
useResizeObserver(previewStageElement, handlePreviewStageResize);
useResizeObserver(previewActionsElement, handleActionsResize);
// 校验并上报用户选择的气泡方位。
function handleBubbleDirectionChange(value: string | number | boolean): void {
  if (value === 'left' || value === 'right') updateBubbleDirection(value);
}
// 校验并上报用户选择的气泡对齐方式。
function handleBubbleAlignChange(value: string | number | boolean): void {
  if (value === 'top' || value === 'center' || value === 'bottom')
    updateBubbleAlign(value);
}
// 校验并上报输入框提交的桌宠尺寸。
function handlePetSizeChange(value: number | undefined): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  // 将用户输入限制在桌宠支持的尺寸区间内。
  const normalizedValue = clamp(Math.round(value), PET_SIZE_MIN, PET_SIZE_MAX);
  updatePetSize(normalizedValue);
}
</script>
<style lang="less" scoped>
@import './index.less';
</style>
