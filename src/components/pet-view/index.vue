<script setup lang="ts">
import { IconClose, IconDelete, IconFile, IconFolder } from '@arco-design/web-vue/es/icon';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ShredProgress, ShredSummary } from '@/type';
import { PET_ACTION_OPTIONS } from './constants';
import DeleteBinIcon from './component/delete-bin-icon.vue';

const petState = ref<'idle' | 'working' | 'success' | 'failure'>('idle');
const bubbleMode = ref<'hidden' | 'actions' | 'confirm' | 'progress' | 'result' | 'error' | 'drop'>('hidden');
const bubblePlacement = ref<'left' | 'right'>('left');
const selectedPaths = ref<string[]>([]);
const presetPasses = ref<3 | 7 | 35>(3);
const progress = ref<ShredProgress | null>(null);
const summary = ref<ShredSummary | null>(null);
const errorMessage = ref('');
const isSubmitting = ref(false);
const dragDepth = ref(0);
const petImageSource = ref('');
const petSize = ref(200);
const petAspectRatio = ref(840 / 594);
const bubbleElement = ref<HTMLElement | null>(null);
const disposers: Array<() => void> = [];
let bubbleResizeObserver: ResizeObserver | null = null;

const actionIcons = {
  file: IconFile,
  directory: IconFolder,
};

const petAppearanceStyle = computed(() => ({
  '--pet-width': `${petSize.value}px`,
  '--pet-height': `${Math.round(petSize.value * petAspectRatio.value)}px`,
}));

const progressPercent = computed(() => {
  if (!progress.value) return 0;
  if (progress.value.stage === 'done') return 100;
  return progress.value.total > 0 ? Math.round(progress.value.completed / progress.value.total * 100) : 0;
});

function showBubble(mode: typeof bubbleMode.value): void {
  bubbleMode.value = mode;
  window.shredderApi.setPetExpanded(mode !== 'hidden');
}

function openActions(): void {
  if (bubbleMode.value === 'progress') return;
  showBubble('actions');
}

function closeBubble(): void {
  if (bubbleMode.value === 'progress') return;
  showBubble('hidden');
}

function reportBubbleBounds(): void {
  if (bubbleMode.value === 'hidden' || !bubbleElement.value) {
    window.shredderApi.setPetBubbleBounds(null);
    return;
  }
  const bounds = bubbleElement.value.getBoundingClientRect();
  // 主进程依据气泡真实尺寸切换鼠标穿透，避免动态内容底部无法点击。
  window.shredderApi.setPetBubbleBounds({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

async function syncBubbleBounds(): Promise<void> {
  await nextTick();
  bubbleResizeObserver?.disconnect();
  if (bubbleElement.value) bubbleResizeObserver?.observe(bubbleElement.value);
  reportBubbleBounds();
}

function handleOutsidePointerDown(event: PointerEvent): void {
  if (event.button !== 0 || bubbleMode.value === 'hidden' || bubbleMode.value === 'progress') return;
  if (event.target instanceof Node && bubbleElement.value?.contains(event.target)) return;
  closeBubble();
}

function handleWindowBlur(): void {
  // 点击透明穿透区域会让窗口失焦，用失焦补足 DOM 外部点击的关闭行为。
  closeBubble();
}

async function prepareTargets(paths: string[]): Promise<void> {
  const [validPaths, settings] = await Promise.all([
    window.shredderApi.prepareShred(paths),
    window.shredderApi.getSettings(),
  ]);
  if (validPaths.length === 0) {
    errorMessage.value = '没有找到可粉碎的文件或文件夹，请检查路径后重试。';
    showBubble('error');
    return;
  }
  selectedPaths.value = validPaths;
  presetPasses.value = settings.passes;
  showBubble('confirm');
}

async function chooseTargets(kind: 'file' | 'directory'): Promise<void> {
  const paths = await window.shredderApi.chooseTargets(kind);
  if (paths.length > 0) await prepareTargets(paths);
}

function removeTarget(path: string): void {
  selectedPaths.value = selectedPaths.value.filter((item) => item !== path);
  // 全部移除后不保留无目标的确认状态，直接返回选择入口。
  if (selectedPaths.value.length === 0) showBubble('actions');
}

function getTargetName(path: string): string {
  // 同时兼容 Windows 与标准路径分隔符，目录尾部带分隔符时也能正确取名。
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

async function confirmShred(): Promise<void> {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  progress.value = null;
  showBubble('progress');
  try {
    // Vue 会把 ref 中的数组转为 Proxy；进入 contextBridge 前必须展开为 Electron 可克隆的普通数组。
    const targets = [...selectedPaths.value];
    const results = await window.shredderApi.shred(targets, presetPasses.value);
    if (results.length === 0) {
      errorMessage.value = '没有可粉碎的目标，或已有粉碎任务正在执行。';
      showBubble('error');
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '粉碎任务执行失败';
    showBubble('error');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDrop(event: DragEvent): Promise<void> {
  dragDepth.value = 0;
  const paths = Array.from(event.dataTransfer?.files ?? [])
    .map((file) => window.shredderApi.getPathForFile(file))
    .filter(Boolean);
  if (paths.length > 0) await prepareTargets(paths);
}

function handleDragEnter(): void {
  dragDepth.value += 1;
  showBubble('drop');
}

function handleDragLeave(): void {
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value === 0 && bubbleMode.value === 'drop') closeBubble();
}

function handlePetImageLoad(event: Event): void {
  const image = event.currentTarget as HTMLImageElement;
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    petAspectRatio.value = image.naturalHeight / image.naturalWidth;
  }
}

async function refreshPetAppearance(): Promise<void> {
  const [settings, templateImage] = await Promise.all([
    window.shredderApi.getSettings(),
    window.shredderApi.getPetImage(),
  ]);
  petSize.value = settings.petSize;
  presetPasses.value = settings.passes;
  // The main process always resolves the active built-in or uploaded template.
  petImageSource.value = templateImage;
}

onMounted(async () => {
  bubbleResizeObserver = new ResizeObserver(reportBubbleBounds);
  document.addEventListener('pointerdown', handleOutsidePointerDown, true);
  window.addEventListener('blur', handleWindowBlur);
  disposers.push(
    window.shredderApi.onSettingsChanged(refreshPetAppearance),
    window.shredderApi.onPetState((state) => { petState.value = state; }),
    window.shredderApi.onPetConfirm((paths, passes) => {
      selectedPaths.value = paths;
      presetPasses.value = passes;
      showBubble('confirm');
    }),
    window.shredderApi.onPetProgress((value) => {
      progress.value = value;
      showBubble('progress');
    }),
    window.shredderApi.onPetComplete((value) => {
      summary.value = value;
      showBubble('result');
    }),
    window.shredderApi.onPetPlacement((placement) => { bubblePlacement.value = placement; }),
  );
  await refreshPetAppearance();
});

watch([bubbleMode, bubblePlacement], syncBubbleBounds, { flush: 'post' });

onBeforeUnmount(() => {
  bubbleResizeObserver?.disconnect();
  document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  window.removeEventListener('blur', handleWindowBlur);
  window.shredderApi.setPetBubbleBounds(null);
  disposers.forEach((dispose) => dispose());
});
</script>

<template>
  <main class="pet-view" :style="petAppearanceStyle" @dragenter.prevent="handleDragEnter" @dragleave.prevent="handleDragLeave" @dragover.prevent @drop.prevent="handleDrop">
    <transition name="pet-bubble">
      <aside v-if="bubbleMode !== 'hidden'" ref="bubbleElement" class="pet-view-bubble" :class="[`pet-view-bubble-${bubblePlacement}`, { 'pet-view-bubble-drop': bubbleMode === 'drop' }]">
        <div class="pet-view-bubble-content">
            <template v-if="bubbleMode === 'actions'">
              <strong class="pet-view-bubble-title">想怎么粉碎？</strong>
              <p class="pet-view-bubble-description">也可以直接把文件或文件夹拖到我身上。</p>
              <div class="pet-view-actions" role="menu">
                <button v-for="item in PET_ACTION_OPTIONS" :key="item.key" class="pet-view-action" type="button" role="menuitem" @click="chooseTargets(item.key)">
                  <span class="pet-view-action-icon-wrap"><component :is="actionIcons[item.key]" class="pet-view-action-icon" /></span>
                  <span class="pet-view-action-content"><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
                </button>
              </div>
            </template>

            <template v-else-if="bubbleMode === 'confirm'">
              <strong class="pet-view-bubble-title">确定永久粉碎吗？</strong>
              <p class="pet-view-bubble-description">共 {{ selectedPaths.length }} 项，此操作不可撤销。</p>
              <a-scrollbar class="pet-view-target-scrollbar-container" outer-class="pet-view-target-scrollbar" outer-style="max-height: 264px" disable-horizontal>
                <div class="pet-view-target-list">
                  <div v-for="path in selectedPaths" :key="path" class="pet-view-target-card">
                    <span class="pet-view-target-path" :title="path">{{ getTargetName(path) }}</span>
                    <a-button class="pet-view-target-remove" type="text" size="small" status="danger" title="移除" :aria-label="`移除 ${path}`" @click.stop="removeTarget(path)">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </div>
                </div>
              </a-scrollbar>
              <div class="pet-view-bubble-footer pet-view-confirm-actions">
                <a-link class="pet-view-confirm-link" @click="closeBubble"><icon-close />取消</a-link>
                <a-link class="pet-view-confirm-link" status="danger" :loading="isSubmitting" @click="confirmShred"><icon-delete />粉碎</a-link>
              </div>
            </template>

            <template v-else-if="bubbleMode === 'progress'">
              <strong class="pet-view-bubble-title">正在粉碎，请稍候…</strong>
              <p class="pet-view-bubble-description">{{ progress?.fileIndex ?? 0 }} / {{ progress?.fileCount ?? 1 }} 个文件</p>
              <a-progress size="small" :percent="progressPercent / 100" :show-text="true" />
              <span class="pet-view-progress-path" :title="progress?.path">{{ progress?.path ?? '正在准备目标' }}</span>
            </template>

            <template v-else-if="bubbleMode === 'result'">
              <strong class="pet-view-bubble-title">{{ summary?.failed ? '部分目标处理失败' : '粉碎完成' }}</strong>
              <p class="pet-view-bubble-description">共处理 {{ summary?.total ?? 0 }} 项，失败 {{ summary?.failed ?? 0 }} 项。</p>
              <a-button type="primary" size="small" long @click="closeBubble">知道了</a-button>
            </template>

            <template v-else-if="bubbleMode === 'drop'">
              <div class="pet-view-drop-hint">
                <delete-bin-icon class="pet-view-drop-icon" />
                <strong>松手删除</strong>
              </div>
            </template>

            <template v-else>
              <strong class="pet-view-bubble-title">暂时无法处理</strong>
              <p class="pet-view-bubble-description">{{ errorMessage }}</p>
              <a-button type="primary" size="small" long @click="showBubble('actions')">重新选择</a-button>
            </template>
        </div>
      </aside>
    </transition>

    <div
      class="pet-view-character"
      @contextmenu.prevent.stop="openActions"
      @mousedown.right.stop
    >
      <img class="pet-view-image" :class="`pet-view-image-${petState}`" :src="petImageSource" alt="桌宠人物" draggable="false" @load="handlePetImageLoad" />
    </div>
  </main>
</template>

<style lang="less" scoped>
@import './index.less';
</style>
