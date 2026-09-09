<template>
  <settings-card
    class="appearance-setting"
    title="外观设置"
  >
    <div class="appearance-setting-workspace">
      <section
        class="appearance-setting-preview"
        aria-label="桌宠与操作气泡实时预览"
      >
        <div
          ref="previewStageElement"
          class="appearance-setting-preview-stage"
          :style="previewSceneStyle"
        >
          <div class="appearance-setting-preview-frame">
            <div class="appearance-setting-preview-scene">
              <div class="appearance-setting-preview-bubble">
                <div class="appearance-setting-preview-bubble-header">
                  <img
                    :src="appIconSource"
                    :alt="appTitle"
                  />
                  <span>
                    <strong>{{ appTitle || '文件粉碎精灵' }}</strong>
                    <small>安全、彻底地清理文件</small>
                  </span>
                  <svg-icon name="app-history" />
                </div>
                <div class="appearance-setting-preview-bubble-actions">
                  <span
                    v-for="item in PET_ACTION_OPTIONS"
                    :key="item.key"
                    :class="`appearance-setting-preview-bubble-action-${item.tone}`"
                  >
                    <span class="appearance-setting-preview-bubble-action-icon">
                      <svg-icon :name="item.icon" />
                    </span>
                    <span
                      class="appearance-setting-preview-bubble-action-content"
                    >
                      <span
                        class="appearance-setting-preview-bubble-action-title"
                      >
                        <strong>{{ item.title }}</strong>
                        <small>{{ item.badge }}</small>
                      </span>
                      <small>{{ item.description }}</small>
                    </span>
                    <svg-icon name="app-arrow-right" />
                  </span>
                </div>
                <footer class="appearance-setting-preview-bubble-tip">
                  <span>
                    <svg-icon name="app-heart" />
                  </span>
                  <small>小贴士：文件或文件夹也可以直接拖到我身上。</small>
                </footer>
              </div>
              <span class="appearance-setting-preview-drag">
                <svg-icon name="app-drag" />
              </span>
              <img
                class="appearance-setting-preview-pet"
                :src="petImageSource"
                alt="桌宠实时预览"
                @load="handlePreviewPetLoad"
              />
            </div>
          </div>
        </div>
      </section>
      <div class="appearance-setting-content">
        <layout-row
          tag="label"
          title="应用名称"
        >
          <a-input
            :model-value="appTitle"
            :max-length="BUBBLE_APP_TITLE_MAX_LENGTH"
            show-word-limit
            @update:model-value="emit('update-app-title', $event)"
            @blur="emit('save-app-title')"
            @press-enter="blurTitleInput"
          />
        </layout-row>
        <layout-row title="应用图标">
          <div
            class="appearance-setting-image-item appearance-setting-icon-item"
          >
            <span class="appearance-setting-image-preview">
              <img
                :src="appIconSource"
                :alt="appTitle"
              />
            </span>
            <div class="appearance-setting-image-actions">
              <button
                class="appearance-setting-image-action"
                type="button"
                title="更换应用图标"
                aria-label="更换应用图标"
                :disabled="isChoosingAppIcon"
                @click.stop="emit('choose-app-icon')"
              >
                <svg-icon name="app-edit" />
              </button>
            </div>
          </div>
        </layout-row>
        <layout-row title="桌宠形象">
          <article
            class="appearance-setting-image-item appearance-setting-pet-item"
          >
            <span class="appearance-setting-image-preview">
              <img
                :src="petImageSource"
                alt="桌宠形象"
              />
            </span>
            <div class="appearance-setting-image-actions">
              <button
                class="appearance-setting-image-action"
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
                class="appearance-setting-image-action"
                type="button"
                title="恢复默认桌宠形象"
                aria-label="恢复默认桌宠形象"
                :disabled="isChoosingPetImage || isRestoringPetImage"
                @click.stop="emit('restore-default-pet-image')"
              >
                <svg-icon name="app-restore" />
              </button>
            </div>
          </article>
        </layout-row>
        <layout-row
          tag="label"
          title="桌宠大小"
        >
          <a-input-number
            :model-value="petSize"
            :min="PET_SIZE_MIN"
            :max="PET_SIZE_MAX"
            :step="PET_SIZE_STEP"
            hide-button
            class="pet-size-input"
            @change="updatePetSize"
          >
            <template #suffix>
              <span class="pet-size-unit">px</span>
            </template>
          </a-input-number>
        </layout-row>
      </div>
    </div>
  </settings-card>
</template>
<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { BUBBLE_APP_TITLE_MAX_LENGTH } from '@/constants';
import { clamp } from '@/utils';
import {
  PET_PREVIEW_BUBBLE_HEIGHT,
  PET_PREVIEW_BUBBLE_SCALE,
  PET_PREVIEW_BUBBLE_WIDTH,
  PET_PREVIEW_GAP,
  PET_PREVIEW_PADDING,
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_STEP,
} from './constants';
import { AppearanceSettingEmits, AppearanceSettingProps } from './type';
import { PET_ACTION_OPTIONS } from '@/components/pet-view/component/pet-bubble-actions/constants';
import LayoutRow from '../layout-row.vue';
import SettingsCard from '../settings-card.vue';
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
// 根据真实场景尺寸与画布范围生成缩放后的预览尺寸。
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
  // 以气泡和桌宠中较高的一项确定完整场景高度。
  const sceneHeight =
    PET_PREVIEW_PADDING * 2 + Math.max(PET_PREVIEW_BUBBLE_HEIGHT, petHeight);
  // 读取画布可用宽度，未完成首次布局时保留原始比例。
  const availableWidth = previewStageSize.value.width;
  // 读取画布可用高度，未完成首次布局时保留原始比例。
  const availableHeight = previewStageSize.value.height;
  // 求取完整场景在当前画布中不发生裁切的最大缩放比例。
  const scale =
    availableWidth > 0 && availableHeight > 0
      ? Math.min(1, availableWidth / sceneWidth, availableHeight / sceneHeight)
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
    '--appearance-setting-preview-bubble-half-height': `${Math.round(
      PET_PREVIEW_BUBBLE_HEIGHT / 2,
    )}px`,
    '--appearance-setting-preview-pet-left': `${
      PET_PREVIEW_PADDING + PET_PREVIEW_BUBBLE_WIDTH + PET_PREVIEW_GAP
    }px`,
    '--appearance-setting-preview-pet-width': `${petWidth}px`,
    '--appearance-setting-preview-pet-half-height': `${Math.round(
      petHeight / 2,
    )}px`,
  };
});
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
// 按下回车时结束编辑，并复用失焦保存逻辑。
function blurTitleInput(event: KeyboardEvent): void {
  (event.currentTarget as HTMLInputElement | null)?.blur();
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
