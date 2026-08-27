import {
  useEventListener,
  useMutationObserver,
  useResizeObserver,
} from '@vueuse/core';
import type {
  PetBubbleMode,
  PetBubblePlacement,
  PetState,
  PetViewContext,
} from '../type';
import type { ShredProgress, ShredSummary, ShredTarget } from '@/type';
import { PET_CLICK_DRAG_THRESHOLD, PROGRESS_TONE_OPTIONS } from '../constants';

const PET_VIEW_CONTEXT_KEY: InjectionKey<PetViewContext> =
  Symbol('pet-view-context');

// 桌宠全部默认状态集中在 context，后续调整初始行为只需修改这一处。
const PET_VIEW_DEFAULTS = {
  petState: 'idle' as PetState,
  bubbleMode: 'hidden' as PetBubbleMode,
  bubblePlacement: 'left' as PetBubblePlacement,
  selectedTargets: [] as ShredTarget[],
  presetPasses: 3 as 0 | 3 | 7 | 35,
  progress: null as ShredProgress | null,
  progressPercent: 0,
  displayedFileIndex: 0,
  summary: null as ShredSummary | null,
  errorMessage: '',
  isSubmitting: false,
  isCancelling: false,
  dragDepth: 0,
  petImageSource: '',
  petSize: 200,
  petAspectRatio: 840 / 594,
  bubbleElement: null as HTMLElement | null,
} as const;

function createPetViewContext(): PetViewContext {
  const petState = ref<PetState>(PET_VIEW_DEFAULTS.petState);
  const bubbleMode = ref<PetBubbleMode>(PET_VIEW_DEFAULTS.bubbleMode);
  const bubblePlacement = ref<PetBubblePlacement>(
    PET_VIEW_DEFAULTS.bubblePlacement,
  );
  const selectedTargets = ref<ShredTarget[]>([
    ...PET_VIEW_DEFAULTS.selectedTargets,
  ]);
  const presetPasses = ref<0 | 3 | 7 | 35>(PET_VIEW_DEFAULTS.presetPasses);
  const progress = ref<ShredProgress | null>(PET_VIEW_DEFAULTS.progress);
  const progressPercent = ref<number>(PET_VIEW_DEFAULTS.progressPercent);
  const displayedFileIndex = ref<number>(PET_VIEW_DEFAULTS.displayedFileIndex);
  const summary = ref<ShredSummary | null>(PET_VIEW_DEFAULTS.summary);
  const errorMessage = ref<string>(PET_VIEW_DEFAULTS.errorMessage);
  const isSubmitting = ref<boolean>(PET_VIEW_DEFAULTS.isSubmitting);
  const isCancelling = ref<boolean>(PET_VIEW_DEFAULTS.isCancelling);
  const dragDepth = ref<number>(PET_VIEW_DEFAULTS.dragDepth);
  const petImageSource = ref<string>(PET_VIEW_DEFAULTS.petImageSource);
  const petSize = ref<number>(PET_VIEW_DEFAULTS.petSize);
  const petAspectRatio = ref<number>(PET_VIEW_DEFAULTS.petAspectRatio);
  const bubbleElement = ref<HTMLElement | null>(
    PET_VIEW_DEFAULTS.bubbleElement,
  );
  let characterPointerStart: { x: number; y: number } | null = null;
  let hasDraggedCharacter = false;
  let bubbleBoundsFrame = 0;
  const disposers: Array<() => void> = [];

  const petAppearanceStyle = computed(() => ({
    '--pet-width': `${petSize.value}px`,
    '--pet-height': `${Math.round(petSize.value * petAspectRatio.value)}px`,
  }));

  const progressTone = computed(
    () =>
      PROGRESS_TONE_OPTIONS.find(
        (item) => progressPercent.value <= item.maximum,
      ) ?? PROGRESS_TONE_OPTIONS[PROGRESS_TONE_OPTIONS.length - 1],
  );

  const formattedDuration = computed(() => {
    const durationMs = summary.value?.durationMs ?? 0;
    if (durationMs < 1000) return `${durationMs} ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)} s`;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.round((durationMs % 60000) / 1000);
    return `${minutes} min ${seconds} s`;
  });

  // 图标名对应本地 SVG 文件名，由 SvgIcon 统一渲染并保证离线可用。
  const resultMetrics = computed(() => [
    {
      key: 'succeeded',
      label: '已删文件',
      value: summary.value?.succeeded ?? 0,
      icon: 'result-check-filled',
      backgroundIcon: 'result-file',
      tone: 'success',
    },
    {
      key: 'failed',
      label: '删除失败',
      value: summary.value?.failed ?? 0,
      icon: 'result-close-filled',
      backgroundIcon: 'result-warning',
      tone: 'failure',
    },
    {
      key: 'duration',
      label: '处理时间',
      value: formattedDuration.value,
      icon: 'result-clock',
      backgroundIcon: 'result-clock',
      tone: 'duration',
    },
  ]);

  function calculateProgressPercent(value: ShredProgress): number {
    const currentFilePercent =
      value.total > 0 ? Math.min(1, value.completed / value.total) : 0;
    const overallPercent =
      (Math.max(0, value.fileIndex - 1) + currentFilePercent) /
      Math.max(1, value.fileCount);
    return Math.round(Math.min(1, overallPercent) * 100);
  }

  function showBubble(mode: PetBubbleMode): void {
    bubbleMode.value = mode;
    window.shredderApi.setPetExpanded(mode !== 'hidden');
  }

  function openActions(): void {
    if (bubbleMode.value === 'progress') return;
    showBubble('actions');
  }

  function handleCharacterMouseDown(event: MouseEvent): void {
    characterPointerStart = { x: event.screenX, y: event.screenY };
    hasDraggedCharacter = false;
  }

  function updateCharacterDragState(event: MouseEvent): void {
    if (!characterPointerStart || hasDraggedCharacter) return;
    const horizontalDistance = event.screenX - characterPointerStart.x;
    const verticalDistance = event.screenY - characterPointerStart.y;
    // 使用屏幕坐标判断窗口真实位移；拖窗过程中 client 坐标可能几乎不变。
    if (
      Math.hypot(horizontalDistance, verticalDistance) >
      PET_CLICK_DRAG_THRESHOLD
    )
      hasDraggedCharacter = true;
  }

  function handleCharacterMouseMove(event: MouseEvent): void {
    if ((event.buttons & 1) === 0) return;
    updateCharacterDragState(event);
  }

  function handleCharacterMouseUp(event: MouseEvent): void {
    if (!characterPointerStart) return;
    updateCharacterDragState(event);
    const shouldToggleActions = !hasDraggedCharacter;
    characterPointerStart = null;
    hasDraggedCharacter = false;
    if (!shouldToggleActions) return;
    if (bubbleMode.value === 'hidden') openActions();
    else closeBubble();
  }

  function closeBubble(): void {
    if (bubbleMode.value === 'progress') return;
    showBubble('hidden');
  }

  function clearSettingsMessagePosition(): void {
    const rootStyle = document.documentElement.style;
    delete document.documentElement.dataset.settingsMessageAligned;
    rootStyle.removeProperty('--settings-message-left');
    rootStyle.removeProperty('--settings-message-top');
    rootStyle.removeProperty('--settings-message-width');
  }

  function updateSettingsMessagePosition(bounds: DOMRect): void {
    const root = document.documentElement;
    // Message 挂载在 body 下，需要同步气泡真实边界，避免按透明窗口居中后偏离设置页。
    root.dataset.settingsMessageAligned = 'true';
    root.style.setProperty('--settings-message-left', `${bounds.left}px`);
    root.style.setProperty('--settings-message-top', `${bounds.top + 12}px`);
    root.style.setProperty('--settings-message-width', `${bounds.width}px`);
  }

  function getInteractiveBubbleBounds(bounds: DOMRect): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    let left = bounds.left;
    let top = bounds.top;
    let right = bounds.right;
    let bottom = bounds.bottom;
    // Arco 浮层挂载在 body 下，必须并入窗口热区，否则超出气泡的部分会点击穿透。
    document
      .querySelectorAll<HTMLElement>('.arco-trigger-popup')
      .forEach((popup) => {
        const popupBounds = popup.getBoundingClientRect();
        const popupStyle = window.getComputedStyle(popup);
        if (
          popupBounds.width <= 0 ||
          popupBounds.height <= 0 ||
          popupStyle.display === 'none' ||
          popupStyle.visibility === 'hidden'
        )
          return;
        left = Math.min(left, popupBounds.left);
        top = Math.min(top, popupBounds.top);
        right = Math.max(right, popupBounds.right);
        bottom = Math.max(bottom, popupBounds.bottom);
      });
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function reportBubbleBounds(): void {
    if (bubbleMode.value === 'hidden' || !bubbleElement.value) {
      clearSettingsMessagePosition();
      window.shredderApi.setPetBubbleBounds(null);
      return;
    }
    const bounds = bubbleElement.value.getBoundingClientRect();
    if (bubbleMode.value === 'settings' || bubbleMode.value === 'records')
      updateSettingsMessagePosition(bounds);
    else clearSettingsMessagePosition();
    // 主进程依据气泡及其浮层的联合尺寸切换鼠标穿透。
    window.shredderApi.setPetBubbleBounds(getInteractiveBubbleBounds(bounds));
  }

  function scheduleBubbleBoundsReport(): void {
    if (bubbleBoundsFrame) return;
    bubbleBoundsFrame = requestAnimationFrame(() => {
      bubbleBoundsFrame = 0;
      reportBubbleBounds();
    });
  }

  async function syncBubbleBounds(): Promise<void> {
    await nextTick();
    reportBubbleBounds();
  }

  function handleOutsidePointerDown(event: PointerEvent): void {
    if (
      event.button !== 0 ||
      bubbleMode.value === 'hidden' ||
      bubbleMode.value === 'progress'
    )
      return;
    // 点击人物由抬起事件统一切换气泡，避免捕获阶段先关闭后又重新打开。
    if (
      event.target instanceof Element &&
      event.target.closest('.pet-view-character')
    )
      return;
    if (
      event.target instanceof Node &&
      bubbleElement.value?.contains(event.target)
    )
      return;
    // 设置中的确认框会挂载到 body，点击浮层仍属于气泡内部交互。
    if (
      event.target instanceof Element &&
      event.target.closest('.arco-trigger-popup')
    )
      return;
    closeBubble();
  }

  function handleWindowBlur(): void {
    // 点击透明穿透区域会让窗口失焦，用失焦补足 DOM 外部点击的关闭行为。
    closeBubble();
  }

  async function prepareTargets(paths: string[]): Promise<void> {
    const [validTargets, settings] = await Promise.all([
      window.shredderApi.prepareShred(paths),
      window.shredderApi.getSettings(),
    ]);
    if (validTargets.length === 0) {
      errorMessage.value = '没有找到可粉碎的文件或文件夹，请检查路径后重试。';
      showBubble('error');
      return;
    }
    selectedTargets.value = validTargets;
    presetPasses.value = settings.passes;
    showBubble('confirm');
  }

  async function chooseTargets(kind: 'file' | 'directory'): Promise<void> {
    const paths = await window.shredderApi.chooseTargets(kind);
    if (paths.length > 0) await prepareTargets(paths);
  }

  function removeTarget(path: string): void {
    selectedTargets.value = selectedTargets.value.filter(
      (item) => item.path !== path,
    );
    // 全部移除后不保留无目标的确认状态，直接返回选择入口。
    if (selectedTargets.value.length === 0) showBubble('actions');
  }

  function getTargetName(path: string): string {
    // 同时兼容 Windows 与标准路径分隔符，目录尾部带分隔符时也能正确取名。
    return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
  }

  async function confirmShred(): Promise<void> {
    if (isSubmitting.value) return;
    isSubmitting.value = true;
    isCancelling.value = false;
    progress.value = null;
    progressPercent.value = PET_VIEW_DEFAULTS.progressPercent;
    displayedFileIndex.value = PET_VIEW_DEFAULTS.displayedFileIndex;
    showBubble('progress');
    try {
      // Vue 会把 ref 中的数组转为 Proxy；进入 contextBridge 前必须展开为 Electron 可克隆的普通数组。
      const targets = selectedTargets.value.map((target) => target.path);
      const results = await window.shredderApi.shred(
        targets,
        presetPasses.value,
      );
      if (results.length === 0) {
        errorMessage.value = '没有可粉碎的目标，或已有粉碎任务正在执行。';
        showBubble('error');
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '粉碎任务执行失败';
      showBubble('error');
    } finally {
      isSubmitting.value = false;
    }
  }

  async function cancelShred(): Promise<void> {
    if (isCancelling.value) return;
    isCancelling.value = true;
    try {
      const cancellationRequested = await window.shredderApi.cancelShred();
      if (!cancellationRequested) isCancelling.value = false;
    } catch {
      // Keep the active progress view usable if the cancellation IPC request itself fails.
      isCancelling.value = false;
    }
  }

  async function handleDrop(event: DragEvent): Promise<void> {
    dragDepth.value = PET_VIEW_DEFAULTS.dragDepth;
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
    dragDepth.value = Math.max(
      PET_VIEW_DEFAULTS.dragDepth,
      dragDepth.value - 1,
    );
    if (
      dragDepth.value === PET_VIEW_DEFAULTS.dragDepth &&
      bubbleMode.value === 'drop'
    )
      closeBubble();
  }

  function handlePetImageLoad(event: Event): void {
    const image = event.currentTarget as HTMLImageElement;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      petAspectRatio.value = image.naturalHeight / image.naturalWidth;
      // Chromium 能正确解码动态 WebP，将真实尺寸同步给主进程以校准点击穿透区域。
      window.shredderApi.setPetImageSize(
        image.naturalWidth,
        image.naturalHeight,
      );
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

  // VueUse 负责观察目标切换和组件卸载，避免动态气泡重复绑定原生监听器。
  useResizeObserver(bubbleElement, reportBubbleBounds);
  useMutationObserver(document.body, scheduleBubbleBoundsReport, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    childList: true,
    subtree: true,
  });
  useEventListener(document, 'pointerdown', handleOutsidePointerDown, {
    capture: true,
  });
  useEventListener(document, 'mousemove', handleCharacterMouseMove);
  useEventListener(window, 'blur', handleWindowBlur);

  onMounted(async () => {
    disposers.push(
      window.shredderApi.onSettingsChanged(refreshPetAppearance),
      window.shredderApi.onOpenSettings(() => {
        if (bubbleMode.value !== 'progress') showBubble('settings');
      }),
      window.shredderApi.onPetState((state) => {
        petState.value = state;
      }),
      window.shredderApi.onPetConfirm((targets, passes) => {
        selectedTargets.value = targets;
        presetPasses.value = passes;
        showBubble('confirm');
      }),
      window.shredderApi.onPetProgress((value) => {
        progress.value = value;
        // 并发文件可能乱序上报，只允许展示值前进，避免序号、颜色和进度条来回跳动。
        progressPercent.value = Math.max(
          progressPercent.value,
          calculateProgressPercent(value),
        );
        const hasCompletedCurrentFile =
          value.stage === 'done' ||
          (value.stage === 'removing' && value.completed >= value.total);
        displayedFileIndex.value = Math.max(
          displayedFileIndex.value,
          Math.max(0, value.fileIndex - Number(!hasCompletedCurrentFile)),
        );
        showBubble('progress');
      }),
      window.shredderApi.onPetComplete((value) => {
        isCancelling.value = false;
        summary.value = value;
        showBubble('result');
      }),
      window.shredderApi.onPetPlacement((placement) => {
        bubblePlacement.value = placement;
      }),
    );
    await refreshPetAppearance();
  });

  watch([bubbleMode, bubblePlacement], syncBubbleBounds, { flush: 'post' });

  onBeforeUnmount(() => {
    if (bubbleBoundsFrame) cancelAnimationFrame(bubbleBoundsFrame);
    clearSettingsMessagePosition();
    window.shredderApi.setPetBubbleBounds(null);
    disposers.forEach((dispose) => dispose());
  });

  return {
    petState,
    petAppearanceStyle,
    petImageSource,
    bubbleElement,
    bubbleMode,
    bubblePlacement,
    selectedTargets,
    progress,
    progressPercent,
    displayedFileIndex,
    progressTone,
    summary,
    resultMetrics,
    errorMessage,
    isSubmitting,
    isCancelling,
    chooseTargets,
    removeTarget,
    getTargetName,
    closeBubble,
    confirmShred,
    cancelShred,
    showBubble,
    openActions,
    handleCharacterMouseDown,
    handleCharacterMouseUp,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    handlePetImageLoad,
  };
}

export function providePetViewContext(): PetViewContext {
  const context = createPetViewContext();
  provide(PET_VIEW_CONTEXT_KEY, context);
  return context;
}

export function usePetViewContext(): PetViewContext {
  const context = inject(PET_VIEW_CONTEXT_KEY);
  if (!context) throw new Error('桌宠气泡必须在 PetView 上下文中使用');
  return context;
}
