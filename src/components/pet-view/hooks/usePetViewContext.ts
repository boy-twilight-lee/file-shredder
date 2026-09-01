import {
  useEventListener,
  useMutationObserver,
  useResizeObserver,
} from '@vueuse/core';
import { PetBubbleMode, PetState, PetViewContext } from '../type';
import { ShredProgress, ShredSummary, ShredTarget } from '@/type';
// 标识桌宠视图所属组件子树中的共享上下文。
const PET_VIEW_CONTEXT_KEY: InjectionKey<PetViewContext> =
  Symbol('pet-view-context');
// 桌宠全部默认状态集中在 context，后续调整初始行为只需修改这一处。
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
// 暴露桌宠视图上下文的提供与注入能力。
export function usePetViewContext() {
  return {
    // 创建并提供桌宠视图共享状态与业务操作。
    provide(): PetViewContext {
      // 保存桌宠当前工作状态。
      const petState = ref<PetState>(PET_VIEW_DEFAULTS.petState);
      // 保存气泡当前展示的业务模式。
      const bubbleMode = ref<PetBubbleMode>(PET_VIEW_DEFAULTS.bubbleMode);
      // 保存用户当前选择的粉碎目标。
      const selectedTargets = ref<ShredTarget[]>([
        ...PET_VIEW_DEFAULTS.selectedTargets,
      ]);
      // 保存当前任务采用的文件覆写次数。
      const presetPasses = ref<0 | 3 | 7 | 35>(PET_VIEW_DEFAULTS.presetPasses);
      // 保存主进程最近上报的粉碎进度。
      const progress = ref<ShredProgress | null>(PET_VIEW_DEFAULTS.progress);
      // 保存用于界面展示的单调总体进度。
      const progressPercent = ref<number>(PET_VIEW_DEFAULTS.progressPercent);
      // 保存进度面板当前展示的文件序号。
      const displayedFileIndex = ref<number>(
        PET_VIEW_DEFAULTS.displayedFileIndex,
      );
      // 保存最近一次粉碎任务的结果汇总。
      const summary = ref<ShredSummary | null>(PET_VIEW_DEFAULTS.summary);
      // 保存需要在结果页展示的顶层错误信息。
      const errorMessage = ref<string>(PET_VIEW_DEFAULTS.errorMessage);
      // 标识粉碎确认请求是否正在提交。
      const isSubmitting = ref<boolean>(PET_VIEW_DEFAULTS.isSubmitting);
      // 标识取消粉碎请求是否正在提交。
      const isCancelling = ref<boolean>(PET_VIEW_DEFAULTS.isCancelling);
      // 保存当前桌宠形象的可加载地址。
      const petImageSource = ref<string>(PET_VIEW_DEFAULTS.petImageSource);
      // 保存桌宠在界面中的目标宽度。
      const petSize = ref<number>(PET_VIEW_DEFAULTS.petSize);
      // 保存桌宠形象真实的高宽比。
      const petAspectRatio = ref<number>(PET_VIEW_DEFAULTS.petAspectRatio);
      // 保存当前业务气泡的根元素引用。
      const bubbleElement = ref<HTMLElement | null>(
        PET_VIEW_DEFAULTS.bubbleElement,
      );
      // 保存待执行的气泡边界上报动画帧。
      let bubbleBoundsFrame = 0;
      // 收集组件销毁时需要执行的 IPC 清理器。
      const disposers: Array<() => void> = [];
      // 根据桌宠尺寸与形象比例生成外观样式变量。
      const petAppearanceStyle = computed(() => ({
        '--pet-width': `${petSize.value}px`,
        '--pet-height': `${Math.round(petSize.value * petAspectRatio.value)}px`,
        '--pet-window-padding': '30px',
        '--pet-bubble-gap': '14px',
      }));
      // 将单文件进度换算为整个任务的单调百分比。
      function calculateProgressPercent(value: ShredProgress): number {
        // 计算当前文件内部已经完成的比例。
        const currentFilePercent =
          value.total > 0 ? Math.min(1, value.completed / value.total) : 0;
        // 合并已完成文件数量与当前文件进度。
        const overallPercent =
          (Math.max(0, value.fileIndex - 1) + currentFilePercent) /
          Math.max(1, value.fileCount);
        return Math.round(Math.min(1, overallPercent) * 100);
      }
      // 切换业务气泡并同步主进程窗口展开状态。
      function showBubble(mode: PetBubbleMode): void {
        if (mode === bubbleMode.value) return;
        bubbleMode.value = mode;
        window.shredderApi.setPetExpanded(mode !== 'hidden');
      }
      // 在非任务执行状态下打开主操作菜单。
      function openActions(): void {
        if (bubbleMode.value === 'progress') return;
        showBubble('actions');
      }
      // 在非任务执行状态下隐藏业务气泡。
      function closeBubble(): void {
        if (bubbleMode.value === 'progress') return;
        showBubble('hidden');
      }
      // 清除设置与记录页面使用的全局消息定位变量。
      function clearSettingsMessagePosition(): void {
        // 读取根元素样式以集中移除定位变量。
        const rootStyle = document.documentElement.style;
        delete document.documentElement.dataset.settingsMessageAligned;
        rootStyle.removeProperty('--settings-message-left');
        rootStyle.removeProperty('--settings-message-top');
        rootStyle.removeProperty('--settings-message-width');
      }
      // 将全局消息容器对齐到当前气泡边界。
      function updateSettingsMessagePosition(bounds: DOMRect): void {
        // 读取文档根元素以同步消息定位状态。
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
      // 合并业务气泡与传送浮层的可交互边界。
      function getInteractiveBubbleBounds(bounds: DOMRect): {
        x: number;
        y: number;
        width: number;
        height: number;
      } {
        // 保存联合边界的最左坐标。
        let left = bounds.left;
        // 保存联合边界的最上坐标。
        let top = bounds.top;
        // 保存联合边界的最右坐标。
        let right = bounds.right;
        // 保存联合边界的最下坐标。
        let bottom = bounds.bottom;
        // Arco 浮层挂载在 body 下，必须并入窗口热区，否则超出气泡的部分会点击穿透。
        document
          .querySelectorAll<HTMLElement>('.arco-trigger-popup')
          .forEach((popup) => {
            // 读取传送浮层在窗口中的实际边界。
            const popupBounds = popup.getBoundingClientRect();
            // 读取传送浮层的可见状态。
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
      // 向主进程上报当前气泡联合交互边界。
      function reportBubbleBounds(): void {
        if (bubbleMode.value === 'hidden' || !bubbleElement.value) {
          clearSettingsMessagePosition();
          window.shredderApi.setPetBubbleBounds(null);
          return;
        }
        // 读取业务气泡在窗口中的实时边界。
        const bounds = bubbleElement.value.getBoundingClientRect();
        if (bubbleMode.value === 'settings' || bubbleMode.value === 'records')
          updateSettingsMessagePosition(bounds);
        else clearSettingsMessagePosition();
        // 主进程依据气泡及其浮层的联合尺寸切换鼠标穿透。
        window.shredderApi.setPetBubbleBounds(
          getInteractiveBubbleBounds(bounds),
        );
      }
      // 合并同一帧内的气泡边界上报请求。
      function scheduleBubbleBoundsReport(): void {
        if (bubbleBoundsFrame) return;
        // 在下一动画帧读取布局，避免同步触发布局抖动。
        bubbleBoundsFrame = requestAnimationFrame(() => {
          bubbleBoundsFrame = 0;
          reportBubbleBounds();
        });
      }
      // 等待 Vue 完成渲染后同步气泡边界。
      async function syncBubbleBounds(): Promise<void> {
        await nextTick();
        reportBubbleBounds();
      }
      // 点击气泡与传送浮层之外的区域时关闭气泡。
      function handleOutsidePointerDown(event: PointerEvent): void {
        if (
          event.button !== 0 ||
          bubbleMode.value === 'hidden' ||
          bubbleMode.value === 'progress'
        )
          return;
        // 人物点击事件统一切换气泡，避免捕获阶段先关闭后又重新打开。
        if (
          event.target instanceof Element &&
          event.target.closest('.pet-character')
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
      // 窗口失焦时补充处理透明区域的外部点击。
      function handleWindowBlur(): void {
        // 点击透明穿透区域会让窗口失焦，用失焦补足 DOM 外部点击的关闭行为。
        closeBubble();
      }
      // 将任务级错误转换为可展示的失败结果。
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
      // 校验候选路径并打开粉碎确认页面。
      async function prepareTargets(paths: string[]): Promise<void> {
        try {
          // 并行读取有效目标与当前清理强度设置。
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
      // 打开系统选择器并准备用户选中的目标。
      async function chooseTargets(kind: 'file' | 'directory'): Promise<void> {
        // 保存系统选择器返回的目标路径。
        const paths = await window.shredderApi.chooseTargets(kind);
        if (paths.length > 0) await prepareTargets(paths);
      }
      // 从本次粉碎目标中移除指定路径。
      function removeTarget(path: string): void {
        // 保留路径与删除目标不匹配的粉碎项。
        selectedTargets.value = selectedTargets.value.filter(
          (item) => item.path !== path,
        );
        // 全部移除后不保留无目标的确认状态，直接返回选择入口。
        if (selectedTargets.value.length === 0) showBubble('actions');
      }
      // 提交当前目标并切换到任务进度页面。
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
          const targets = selectedTargets.value.map((target) => target.path);
          // 保存主进程返回的逐目标粉碎结果。
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
      // 请求主进程取消当前粉碎任务。
      async function cancelShred(): Promise<void> {
        if (isCancelling.value) return;
        isCancelling.value = true;
        try {
          // 标识主进程是否接受了本次取消请求。
          const cancellationRequested = await window.shredderApi.cancelShred();
          if (!cancellationRequested) isCancelling.value = false;
        } catch {
          // IPC 取消请求失败时恢复按钮状态，保持当前进度页可继续操作。
          isCancelling.value = false;
        }
      }
      // 从拖放文件中提取路径并准备粉碎目标。
      async function handleDrop(event: DragEvent): Promise<void> {
        // 提取 Electron 可识别的本地文件路径。
        const paths = Array.from(event.dataTransfer?.files ?? [])
          .map((file) => window.shredderApi.getPathForFile(file))
          .filter(Boolean);
        if (paths.length > 0) await prepareTargets(paths);
      }
      // 图片加载完成后同步真实比例与主进程点击区域。
      function handlePetImageLoad(event: Event): void {
        // 读取触发加载事件的桌宠图片元素。
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
      // 从主进程刷新桌宠尺寸、清理强度与当前形象。
      async function refreshPetAppearance(): Promise<void> {
        // 并行读取桌宠外观依赖的设置与形象地址。
        const [settings, templateImage] = await Promise.all([
          window.shredderApi.getSettings(),
          window.shredderApi.getPetImage(),
        ]);
        petSize.value = settings.petSize;
        presetPasses.value = settings.passes;
        // 主进程统一解析当前生效的内置或用户上传形象。
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
      useEventListener(window, 'blur', handleWindowBlur);
      // 组件挂载后订阅主进程事件并加载桌宠外观。
      onMounted(async () => {
        disposers.push(
          // 设置变化后刷新桌宠外观。
          window.shredderApi.onSettingsChanged(refreshPetAppearance),
          // 主进程请求时打开设置页面。
          window.shredderApi.onOpenSettings(() => {
            if (bubbleMode.value !== 'progress') showBubble('settings');
          }),
          // 同步主进程上报的桌宠工作状态。
          window.shredderApi.onPetState((state) => {
            petState.value = state;
          }),
          // 接收外部粉碎目标并打开确认页面。
          window.shredderApi.onPetConfirm((targets, passes) => {
            errorMessage.value = '';
            selectedTargets.value = targets;
            presetPasses.value = passes;
            showBubble('confirm');
          }),
          // 合并主进程上报的实时任务进度。
          window.shredderApi.onPetProgress((value) => {
            progress.value = value;
            // 并发文件可能乱序上报，只允许展示值前进，避免序号、颜色和进度条来回跳动。
            progressPercent.value = Math.max(
              progressPercent.value,
              calculateProgressPercent(value),
            );
            // 标识当前文件是否已经进入完成状态。
            const hasCompletedCurrentFile =
              value.stage === 'done' ||
              (value.stage === 'removing' && value.completed >= value.total);
            displayedFileIndex.value = Math.max(
              displayedFileIndex.value,
              Math.max(0, value.fileIndex - Number(!hasCompletedCurrentFile)),
            );
            showBubble('progress');
          }),
          // 接收任务汇总并打开结果页面。
          window.shredderApi.onPetComplete((value) => {
            isCancelling.value = false;
            errorMessage.value = '';
            summary.value = value;
            showBubble('result');
          }),
        );
        await refreshPetAppearance();
      });
      // 气泡模式变化后等待视图更新并同步交互边界。
      watch(bubbleMode, syncBubbleBounds, { flush: 'post' });
      // 组件销毁前取消动画帧、清理边界并解除 IPC 监听。
      onBeforeUnmount(() => {
        if (bubbleBoundsFrame) cancelAnimationFrame(bubbleBoundsFrame);
        clearSettingsMessagePosition();
        window.shredderApi.setPetBubbleBounds(null);
        // 依次执行已注册的 IPC 事件清理器。
        disposers.forEach((dispose) => dispose());
      });
      // 定义拥有者与后代组件共享的桌宠上下文。
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
    // 读取桌宠共享上下文，并在所属子树外提供安全默认值。
    inject(): PetViewContext {
      return inject(PET_VIEW_CONTEXT_KEY, {
        petState: ref('idle'),
        // 在上下文外提供空的外观样式。
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
        // 在上下文外忽略目标选择请求。
        chooseTargets: async () => {},
        // 在上下文外忽略目标移除请求。
        removeTarget: () => {},
        // 在上下文外忽略气泡关闭请求。
        closeBubble: () => {},
        // 在上下文外忽略粉碎确认请求。
        confirmShred: async () => {},
        // 在上下文外忽略任务取消请求。
        cancelShred: async () => {},
        // 在上下文外忽略气泡模式切换请求。
        showBubble: () => {},
        // 在上下文外忽略主操作菜单打开请求。
        openActions: () => {},
        // 在上下文外忽略文件拖放事件。
        handleDrop: async () => {},
        // 在上下文外忽略桌宠图片加载事件。
        handlePetImageLoad: () => {},
      });
    },
  };
}
