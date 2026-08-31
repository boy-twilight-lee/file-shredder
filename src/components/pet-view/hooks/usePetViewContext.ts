import {
  useEventListener,
  useMutationObserver,
  useResizeObserver,
} from '@vueuse/core';
import { PetBubbleMode, PetState, PetViewContext } from '../type';
import { ShredProgress, ShredSummary, ShredTarget } from '@/type';

// 桌宠视图专用的依赖注入键，避免与其他组件上下文冲突。
const PET_VIEW_CONTEXT_KEY: InjectionKey<PetViewContext> =
  Symbol('pet-view-context');

// 桌宠全部默认状态集中在这里，后续调整初始行为只需修改这一处。
const PET_VIEW_DEFAULTS = {
  petState: 'idle' as PetState,
  bubbleMode: 'hidden' as PetBubbleMode,
  selectedTargets: [] as ShredTarget[],
  presetPasses: 3 as 0 | 3 | 7 | 35,
  progress: null as ShredProgress | null,
  progressPercent: 0,
  displayedFileIndex: 0,
  summary: null as ShredSummary | null,
  errorMessage: '',
  isSubmitting: false,
  isCancelling: false,
  petImageSource: '',
  petSize: 200,
  petAspectRatio: 840 / 594,
  bubbleElement: null as HTMLElement | null,
} as const;

// 创建桌宠视图的 provide/inject 上下文入口。
export function usePetViewContext() {
  return {
    // 在桌宠视图根组件中创建状态、业务方法和副作用，并向后代提供同一份上下文。
    provide(): PetViewContext {
      // 当前桌宠运行状态，用于切换空闲、工作和结果反馈形象。
      const petState = ref<PetState>(PET_VIEW_DEFAULTS.petState);
      // 当前气泡页面，hidden 表示不展示任何气泡内容。
      const bubbleMode = ref<PetBubbleMode>(PET_VIEW_DEFAULTS.bubbleMode);
      // 当前等待粉碎的文件和文件夹列表。
      const selectedTargets = ref<ShredTarget[]>([
        ...PET_VIEW_DEFAULTS.selectedTargets,
      ]);
      // 当前选择的文件覆写次数。
      const presetPasses = ref<0 | 3 | 7 | 35>(PET_VIEW_DEFAULTS.presetPasses);
      // 主进程最近一次上报的粉碎进度详情。
      const progress = ref<ShredProgress | null>(PET_VIEW_DEFAULTS.progress);
      // 合并多文件进度后的页面展示百分比。
      const progressPercent = ref<number>(PET_VIEW_DEFAULTS.progressPercent);
      // 已完成并允许在进度页展示的文件序号。
      const displayedFileIndex = ref<number>(
        PET_VIEW_DEFAULTS.displayedFileIndex,
      );
      // 最近一次粉碎任务的汇总结果。
      const summary = ref<ShredSummary | null>(PET_VIEW_DEFAULTS.summary);
      // 结果页需要展示的业务错误信息。
      const errorMessage = ref<string>(PET_VIEW_DEFAULTS.errorMessage);
      // 是否正在向主进程提交粉碎任务，防止重复提交。
      const isSubmitting = ref<boolean>(PET_VIEW_DEFAULTS.isSubmitting);
      // 是否正在请求取消粉碎任务，防止重复取消。
      const isCancelling = ref<boolean>(PET_VIEW_DEFAULTS.isCancelling);
      // 当前桌宠图片的可加载地址。
      const petImageSource = ref<string>(PET_VIEW_DEFAULTS.petImageSource);
      // 当前桌宠显示宽度，单位为 px。
      const petSize = ref<number>(PET_VIEW_DEFAULTS.petSize);
      // 当前图片的高宽比，用于按真实比例计算桌宠高度。
      const petAspectRatio = ref<number>(PET_VIEW_DEFAULTS.petAspectRatio);
      // 当前气泡内容根元素，用于对齐设置和记录页的全局消息。
      const bubbleElement = ref<HTMLElement | null>(
        PET_VIEW_DEFAULTS.bubbleElement,
      );
      // 已预约的气泡布局同步动画帧编号，避免同一帧重复测量。
      let bubbleLayoutFrame = 0;
      // 主进程事件订阅的释放函数集合。
      const disposers: Array<() => void> = [];

      // 根据桌宠宽度和图片比例生成根组件与浮层共用的尺寸变量。
      const petAppearanceStyle = computed(() => ({
        '--pet-width': `${petSize.value}px`,
        '--pet-height': `${Math.round(petSize.value * petAspectRatio.value)}px`,
      }));

      // 将单文件进度换算为整个任务单调递增的百分比。
      function calculateProgressPercent(value: ShredProgress): number {
        // 当前文件内部已经完成的比例。
        const currentFilePercent =
          value.total > 0 ? Math.min(1, value.completed / value.total) : 0;
        // 当前文件序号与文件内部进度合并后的任务总比例。
        const overallPercent =
          (Math.max(0, value.fileIndex - 1) + currentFilePercent) /
          Math.max(1, value.fileCount);
        return Math.round(Math.min(1, overallPercent) * 100);
      }

      // 切换气泡页面，并同步主进程的桌宠展开状态。
      function showBubble(mode: PetBubbleMode): void {
        bubbleMode.value = mode;
        window.shredderApi.setPetExpanded(mode !== 'hidden');
      }

      // 打开首页操作菜单，粉碎进行中不允许离开进度页。
      function openActions(): void {
        if (bubbleMode.value === 'progress') return;
        showBubble('actions');
      }

      // 关闭当前气泡，粉碎进行中保持进度页可见。
      function closeBubble(): void {
        if (bubbleMode.value === 'progress') return;
        showBubble('hidden');
      }

      // 清除设置和记录页为 Arco Message 写入的定位变量。
      function clearSettingsMessagePosition(): void {
        // 文档根节点的内联样式用于保存跨 Teleport 的定位信息。
        const rootStyle = document.documentElement.style;
        delete document.documentElement.dataset.settingsMessageAligned;
        rootStyle.removeProperty('--settings-message-left');
        rootStyle.removeProperty('--settings-message-top');
        rootStyle.removeProperty('--settings-message-width');
      }

      // 根据业务面板真实边界更新 Arco Message 的显示位置。
      function updateSettingsMessagePosition(bounds: DOMRect): void {
        // 文档根节点同时承载定位标记和尺寸变量。
        const root = document.documentElement;
        // Message 挂载在 body 下，需要同步气泡真实边界，避免按透明窗口居中后偏离设置页。
        root.dataset.settingsMessageAligned = 'true';
        root.style.setProperty('--settings-message-left', `${bounds.left}px`);
        root.style.setProperty(
          '--settings-message-top',
          `${bounds.top + 12}px`,
        );
        root.style.setProperty('--settings-message-width', `${bounds.width}px`);
      }

      // 使用业务面板真实边界对齐设置和记录页中的全局消息。
      function syncBubbleLayout(): void {
        if (
          !bubbleElement.value ||
          (bubbleMode.value !== 'settings' && bubbleMode.value !== 'records')
        ) {
          clearSettingsMessagePosition();
          return;
        }
        // 当前设置或记录面板的实际渲染边界。
        const bounds = bubbleElement.value.getBoundingClientRect();
        updateSettingsMessagePosition(bounds);
      }

      // 将频繁的 DOM 变化合并为每帧一次布局同步。
      function scheduleBubbleLayoutSync(): void {
        if (bubbleLayoutFrame) return;
        bubbleLayoutFrame = requestAnimationFrame(() => {
          bubbleLayoutFrame = 0;
          syncBubbleLayout();
        });
      }

      // 等待 Vue 完成气泡切换后同步业务面板布局。
      async function syncBubbleAfterRender(): Promise<void> {
        await nextTick();
        syncBubbleLayout();
      }

      // 窗口失焦时关闭非进度气泡，补足透明区域的点击穿透场景。
      function handleWindowBlur(): void {
        // 点击透明穿透区域会让窗口失焦，用失焦补足 DOM 外部点击的关闭行为。
        closeBubble();
      }

      // 将无法进入正常粉碎流程的异常统一转换为结果页数据。
      function showErrorResult(message: string, failedCount: number): void {
        errorMessage.value = message;
        summary.value = {
          succeeded: 0,
          failed: Math.max(1, failedCount),
          durationMs: 0,
          cancelled: false,
        };
        showBubble('result');
      }

      // 校验用户选择的路径并准备确认页所需的目标和清理强度。
      async function prepareTargets(paths: string[]): Promise<void> {
        try {
          // 有效目标和用户设置可以并行读取，减少确认页等待时间。
          const [validTargets, settings] = await Promise.all([
            window.shredderApi.prepareShred(paths),
            window.shredderApi.getSettings(),
          ]);
          if (validTargets.length === 0) {
            showErrorResult(
              '没有找到可粉碎的文件或文件夹，请检查路径后重试。',
              paths.length,
            );
            return;
          }
          errorMessage.value = '';
          selectedTargets.value = validTargets;
          presetPasses.value = settings.passes;
          showBubble('confirm');
        } catch (error) {
          showErrorResult(
            error instanceof Error ? error.message : '粉碎目标读取失败',
            paths.length,
          );
        }
      }

      // 打开系统文件选择器，并在成功选择后准备粉碎目标。
      async function chooseTargets(kind: 'file' | 'directory'): Promise<void> {
        // 系统选择器返回的本地文件或文件夹路径。
        const paths = await window.shredderApi.chooseTargets(kind);
        if (paths.length > 0) await prepareTargets(paths);
      }

      // 从待粉碎列表移除指定路径，并在清空后返回操作菜单。
      function removeTarget(path: string): void {
        selectedTargets.value = selectedTargets.value.filter(
          (item) => item.path !== path,
        );
        // 全部移除后不保留无目标的确认状态，直接返回选择入口。
        if (selectedTargets.value.length === 0) showBubble('actions');
      }

      // 提交粉碎任务并切换到不可关闭的进度页。
      async function confirmShred(): Promise<void> {
        if (isSubmitting.value) return;
        isSubmitting.value = true;
        isCancelling.value = false;
        progress.value = null;
        progressPercent.value = PET_VIEW_DEFAULTS.progressPercent;
        displayedFileIndex.value = PET_VIEW_DEFAULTS.displayedFileIndex;
        errorMessage.value = '';
        showBubble('progress');
        try {
          // Vue 会把 ref 中的数组转为 Proxy；进入 contextBridge 前必须展开为 Electron 可克隆的普通数组。
          // 提交给主进程的普通路径数组。
          const targets = selectedTargets.value.map((target) => target.path);
          // 主进程完成调用后返回的逐目标处理结果。
          const results = await window.shredderApi.shred(
            targets,
            presetPasses.value,
          );
          if (results.length === 0 && bubbleMode.value === 'progress') {
            showErrorResult(
              '没有可粉碎的目标，或已有粉碎任务正在执行。',
              selectedTargets.value.length,
            );
          }
        } catch (error) {
          showErrorResult(
            error instanceof Error ? error.message : '粉碎任务执行失败',
            selectedTargets.value.length,
          );
        } finally {
          isSubmitting.value = false;
        }
      }

      // 请求取消当前粉碎任务，并根据主进程响应恢复按钮状态。
      async function cancelShred(): Promise<void> {
        if (isCancelling.value) return;
        isCancelling.value = true;
        try {
          // 主进程是否已经接受本次取消请求。
          const cancellationRequested = await window.shredderApi.cancelShred();
          if (!cancellationRequested) isCancelling.value = false;
        } catch {
          // Keep the active progress view usable if the cancellation IPC request itself fails.
          isCancelling.value = false;
        }
      }

      // 处理拖入桌宠的文件，并复用目标准备流程。
      async function handleDrop(event: DragEvent): Promise<void> {
        // 从拖拽文件对象中提取 Electron 可访问的本地路径。
        const paths = Array.from(event.dataTransfer?.files ?? [])
          .map((file) => window.shredderApi.getPathForFile(file))
          .filter(Boolean);
        if (paths.length > 0) await prepareTargets(paths);
      }

      // 图片加载完成后同步真实高宽比和主进程命中区域。
      function handlePetImageLoad(event: Event): void {
        // 触发加载事件的桌宠图片元素。
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

      // 从主进程刷新桌宠图片、尺寸和默认清理强度。
      async function refreshPetAppearance(): Promise<void> {
        // 用户设置和当前模板图片互不依赖，可以并行读取。
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
      useResizeObserver(bubbleElement, syncBubbleLayout);
      useMutationObserver(document.body, scheduleBubbleLayoutSync, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true,
      });
      useEventListener(window, 'blur', handleWindowBlur);

      // 初始化主进程事件订阅并读取首次渲染所需的桌宠配置。
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
            errorMessage.value = '';
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
            // 当前文件是否已经完成到可以推进展示序号的阶段。
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
            errorMessage.value = '';
            summary.value = value;
            showBubble('result');
          }),
        );
        await refreshPetAppearance();
      });

      // 气泡页面变化后重新测量 Teleport 完成后的业务面板布局。
      watch(bubbleMode, syncBubbleAfterRender, { flush: 'post' });

      // 组件销毁时取消动画帧、清理定位状态并释放全部主进程监听器。
      onBeforeUnmount(() => {
        if (bubbleLayoutFrame) cancelAnimationFrame(bubbleLayoutFrame);
        clearSettingsMessagePosition();
        disposers.forEach((dispose) => dispose());
      });

      // 对外暴露的上下文对象，provide 与根组件共享同一实例。
      const context = {
        petState,
        petAppearanceStyle,
        petImageSource,
        bubbleElement,
        bubbleMode,
        selectedTargets,
        progress,
        progressPercent,
        displayedFileIndex,
        summary,
        errorMessage,
        isSubmitting,
        isCancelling,
        chooseTargets,
        removeTarget,
        closeBubble,
        confirmShred,
        cancelShred,
        showBubble,
        openActions,
        handleDrop,
        handlePetImageLoad,
      };
      provide(PET_VIEW_CONTEXT_KEY, context);
      return context;
    },
    // 为后代组件读取上下文，并在脱离提供者渲染时返回类型完整的安全默认值。
    inject(): PetViewContext {
      return inject(PET_VIEW_CONTEXT_KEY, {
        petState: ref('idle'),
        petAppearanceStyle: computed(() => ({})),
        petImageSource: ref(''),
        bubbleElement: ref(null),
        bubbleMode: ref('hidden'),
        selectedTargets: ref([]),
        progress: ref(null),
        progressPercent: ref(0),
        displayedFileIndex: ref(0),
        summary: ref(null),
        errorMessage: ref(''),
        isSubmitting: ref(false),
        isCancelling: ref(false),
        chooseTargets: async () => {},
        removeTarget: () => {},
        closeBubble: () => {},
        confirmShred: async () => {},
        cancelShred: async () => {},
        showBubble: () => {},
        openActions: () => {},
        handleDrop: async () => {},
        handlePetImageLoad: () => {},
      });
    },
  };
}
