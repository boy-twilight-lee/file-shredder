<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { ShredProgress, ShredSummary } from '@/type';
import defaultPetImage from '@/assets/pet.png';
import { PET_ACTION_OPTIONS, SHRED_LEVEL_OPTIONS } from './constants';

const petState = ref<'idle' | 'working' | 'success' | 'failure'>('idle');
const bubbleMode = ref<'hidden' | 'actions' | 'path' | 'confirm' | 'progress' | 'result' | 'error' | 'drop'>('hidden');
const bubblePlacement = ref<'above' | 'left' | 'right' | 'below'>('above');
const selectedPaths = ref<string[]>([]);
const pathInput = ref('');
const overwritePasses = ref<3 | 7 | 35>(3);
const progress = ref<ShredProgress | null>(null);
const summary = ref<ShredSummary | null>(null);
const errorMessage = ref('');
const isSubmitting = ref(false);
const dragDepth = ref(0);
const petImageSource = ref(defaultPetImage);
const petSize = ref(200);
const petAspectRatio = ref(840 / 594);
const disposers: Array<() => void> = [];

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
  overwritePasses.value = settings.passes;
  showBubble('confirm');
}

async function chooseTargets(kind: 'file' | 'directory'): Promise<void> {
  const paths = await window.shredderApi.chooseTargets(kind);
  if (paths.length > 0) await prepareTargets(paths);
}

async function handleAction(action: typeof PET_ACTION_OPTIONS[number]['key']): Promise<void> {
  if (action === 'path') {
    showBubble('path');
    return;
  }
  await chooseTargets(action);
}

async function submitPath(): Promise<void> {
  const path = pathInput.value.trim();
  if (!path) return;
  await prepareTargets([path]);
}

async function confirmShred(): Promise<void> {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  progress.value = null;
  showBubble('progress');
  try {
    await window.shredderApi.shred(selectedPaths.value, overwritePasses.value);
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
  const [settings, customImage] = await Promise.all([
    window.shredderApi.getSettings(),
    window.shredderApi.getPetImage(),
  ]);
  petSize.value = settings.petSize;
  petImageSource.value = customImage || defaultPetImage;
}

onMounted(async () => {
  disposers.push(
    window.shredderApi.onSettingsChanged(refreshPetAppearance),
    window.shredderApi.onPetState((state) => { petState.value = state; }),
    window.shredderApi.onPetConfirm((paths, passes) => {
      selectedPaths.value = paths;
      overwritePasses.value = passes;
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

onBeforeUnmount(() => disposers.forEach((dispose) => dispose()));
</script>

<template>
  <main class="pet-view" :style="petAppearanceStyle" @dragenter.prevent="handleDragEnter" @dragleave.prevent="handleDragLeave" @dragover.prevent @drop.prevent="handleDrop">
    <aside v-if="bubbleMode !== 'hidden'" class="pet-view-bubble" :class="`pet-view-bubble-${bubblePlacement}`">
      <button v-if="bubbleMode !== 'progress'" class="pet-view-bubble-close" type="button" aria-label="关闭" @click="closeBubble">×</button>

      <template v-if="bubbleMode === 'actions'">
        <strong class="pet-view-bubble-title">想怎么粉碎？</strong>
        <p class="pet-view-bubble-description">也可以直接把文件或文件夹拖到我身上。</p>
        <div class="pet-view-actions" role="menu">
          <button v-for="item in PET_ACTION_OPTIONS" :key="item.key" class="pet-view-action" type="button" role="menuitem" @click="handleAction(item.key)">
            <span><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span><b>›</b>
          </button>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'path'">
        <strong class="pet-view-bubble-title">输入文件或文件夹路径</strong>
        <a-input v-model="pathInput" placeholder="D:\Work\secret.zip" allow-clear @press-enter="submitPath" />
        <div class="pet-view-bubble-footer">
          <a-button type="text" @click="showBubble('actions')">返回</a-button>
          <a-button type="primary" @click="submitPath">继续</a-button>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'confirm'">
        <strong class="pet-view-bubble-title">确定永久粉碎吗？</strong>
        <p class="pet-view-bubble-description">共 {{ selectedPaths.length }} 项，将覆写 {{ overwritePasses }} 次，此操作不可撤销。</p>
        <div class="pet-view-target-list">
          <span v-for="path in selectedPaths.slice(0, 3)" :key="path" :title="path">{{ path }}</span>
          <span v-if="selectedPaths.length > 3">另有 {{ selectedPaths.length - 3 }} 项…</span>
        </div>
        <div class="pet-view-levels" role="menu" aria-label="清除强度">
          <button v-for="item in SHRED_LEVEL_OPTIONS" :key="item.value" class="pet-view-level" :class="{ 'pet-view-level-active': overwritePasses === item.value }" type="button" role="menuitemradio" :aria-checked="overwritePasses === item.value" @click="overwritePasses = item.value">
            <strong>{{ item.title }}</strong><small>{{ item.description }}</small>
          </button>
        </div>
        <div class="pet-view-bubble-footer">
          <a-button type="outline" @click="closeBubble">取消</a-button>
          <a-button type="primary" status="danger" :loading="isSubmitting" @click="confirmShred">确认粉碎</a-button>
        </div>
      </template>

      <template v-else-if="bubbleMode === 'progress'">
        <strong class="pet-view-bubble-title">正在粉碎，请稍候…</strong>
        <p class="pet-view-bubble-description">{{ progress?.fileIndex ?? 0 }} / {{ progress?.fileCount ?? 1 }} 个文件</p>
        <a-progress :percent="progressPercent / 100" :show-text="true" />
        <span class="pet-view-progress-path" :title="progress?.path">{{ progress?.path ?? '正在准备目标' }}</span>
      </template>

      <template v-else-if="bubbleMode === 'result'">
        <strong class="pet-view-bubble-title">{{ summary?.failed ? '部分目标处理失败' : '粉碎完成' }}</strong>
        <p class="pet-view-bubble-description">共处理 {{ summary?.total ?? 0 }} 项，失败 {{ summary?.failed ?? 0 }} 项。</p>
        <a-button type="primary" long @click="closeBubble">知道了</a-button>
      </template>

      <template v-else-if="bubbleMode === 'drop'">
        <strong class="pet-view-bubble-title">松开即可添加</strong>
        <p class="pet-view-bubble-description">文件和文件夹都会先进入二次确认，不会立即删除。</p>
      </template>

      <template v-else>
        <strong class="pet-view-bubble-title">暂时无法处理</strong>
        <p class="pet-view-bubble-description">{{ errorMessage }}</p>
        <a-button type="primary" long @click="showBubble('actions')">重新选择</a-button>
      </template>
    </aside>

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
