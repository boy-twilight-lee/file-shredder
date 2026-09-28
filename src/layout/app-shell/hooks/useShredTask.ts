import { Message } from '@arco-design/web-vue';
import { computed, ComputedRef, onScopeDispose, Ref, ref } from 'vue';
import { SHRED_STEPS } from '@/constants';
import {
  formatDateTime,
  mergeShredTargets,
  removeShredTargets,
  resolveErrorMessage,
  resolveFilePercent,
  resolveResultTone,
  toShredDraftTarget,
  toggleSelectedTarget,
} from '@/utils';
import {
  AppSettings,
  ShredDetailRow,
  ShredDraftTarget,
  ShredPasses,
  ShredProgress,
  ShredResult,
  ShredResultTone,
  ShredStep,
  ShredSummary,
  ShredTarget,
  TaskState,
} from '@/type';
// 定义清理任务对外暴露的状态与动作，供外壳与任务页共享。
export interface ShredTask {
  step: Ref<ShredStep>;
  stepIndex: ComputedRef<number>;
  targets: Ref<ShredDraftTarget[]>;
  selectedPaths: Ref<string[]>;
  passes: Ref<ShredPasses>;
  progress: Ref<ShredProgress | null>;
  summary: Ref<ShredSummary | null>;
  results: Ref<ShredResult[]>;
  details: Ref<ShredDetailRow[]>;
  isConfirmVisible: Ref<boolean>;
  running: ComputedRef<boolean>;
  resultTone: ComputedRef<ShredResultTone>;
  addTargets: (paths: string[]) => Promise<void>;
  addPreparedTargets: (targets: ShredTarget[], passes?: ShredPasses) => void;
  removeTargets: (paths: string[]) => void;
  toggleTarget: (path: string, checked: boolean) => void;
  setSelectedPaths: (paths: string[]) => void;
  removeSelectedTargets: () => void;
  requestShred: () => void;
  confirmShred: () => Promise<void>;
  dismissConfirm: () => void;
  cancelShred: () => Promise<void>;
  finishShred: () => void;
}
// 创建清理任务状态机，负责目标草稿、步骤推进与主进程任务订阅。
export function useShredTask(getSettings: () => AppSettings): ShredTask {
  // 保存当前步骤。
  const step = ref<ShredStep>('select');
  // 保存待清除目标草稿。
  const targets = ref<ShredDraftTarget[]>([]);
  // 保存当前勾选的目标路径。
  const selectedPaths = ref<string[]>([]);
  // 保存本次任务使用的清理级别。
  const passes = ref<ShredPasses>(getSettings().passes);
  // 保存主进程推送的最新进度。
  const progress = ref<ShredProgress | null>(null);
  // 保存任务结束后的汇总结果。
  const summary = ref<ShredSummary | null>(null);
  // 保存本次任务逐文件的处理结果，供结果页汇总每个顶层目标的状态。
  const results = ref<ShredResult[]>([]);
  // 保存进度页处理明细的逐行记录。
  const details = ref<ShredDetailRow[]>([]);
  // 保存清理确认弹窗的显示状态。
  const isConfirmVisible = ref(false);
  // 保存主进程上报的任务运行状态。
  const taskState = ref<TaskState>('idle');
  // 当前步骤在步骤条中的下标。
  const stepIndex = computed(() =>
    SHRED_STEPS.findIndex((item) => item.key === step.value),
  );
  // 标识当前是否存在正在执行的清理任务。
  const running = computed(() => taskState.value === 'working');
  // 按汇总结果推导结果页使用的三态语义。
  const resultTone = computed<ShredResultTone>(() =>
    resolveResultTone(
      summary.value ?? {
        succeeded: 0,
        failed: 0,
        durationMs: 0,
        cancelled: false,
      },
    ),
  );
  // 清空进度相关的临时状态。
  function resetProgressState(): void {
    progress.value = null;
    summary.value = null;
    results.value = [];
    details.value = [];
  }
  // 接收主进程进度推送，同时按当前目标补齐处理明细行。
  function handleProgress(next: ShredProgress): void {
    progress.value = next;
    // 取最后一行明细用于判断目标是否发生切换。
    const lastRow = details.value[details.value.length - 1];
    if (lastRow && lastRow.path === next.path) {
      lastRow.stage = next.stage;
      return;
    }
    if (lastRow) lastRow.status = 'done';
    details.value.push({
      id: `${next.path}#${details.value.length}`,
      path: next.path,
      time: formatDateTime(new Date()),
      stage: next.stage,
      status: 'working',
    });
  }
  // 接收任务结束事件，切换到结果页并收尾明细状态。
  function handleComplete(next: ShredSummary): void {
    summary.value = next;
    details.value.forEach((row) => {
      row.status = 'done';
    });
    isConfirmVisible.value = false;
    step.value = 'result';
  }
  // 接收外部启动的目标与清理级别，直接进入确认步骤。
  function handleExternalConfirm(
    externalTargets: ShredTarget[],
    externalPasses: ShredPasses,
  ): void {
    addPreparedTargets(externalTargets, externalPasses);
    // 外部启动必须经过确认，避免未经用户同意清理文件。
    isConfirmVisible.value = true;
  }
  // 订阅主进程任务事件，并在作用域销毁时解除订阅。
  const disposers = [
    window.shredderApi.onTaskProgress(handleProgress),
    window.shredderApi.onTaskComplete(handleComplete),
    window.shredderApi.onTaskState((state) => {
      taskState.value = state;
    }),
    window.shredderApi.onTaskConfirm(handleExternalConfirm),
  ];
  onScopeDispose(() => disposers.forEach((dispose) => dispose()));
  // 将已经完成元数据读取的目标加入草稿。
  function addPreparedTargets(
    prepared: ShredTarget[],
    nextPasses?: ShredPasses,
  ): void {
    targets.value = mergeShredTargets(
      targets.value,
      prepared.map(toShredDraftTarget),
    );
    // 新加入的目标默认全部勾选。
    selectedPaths.value = targets.value.map((target) => target.path);
    if (nextPasses !== undefined) passes.value = nextPasses;
    if (targets.value.length > 0) step.value = 'confirm';
  }
  // 校验拖入或选择的路径并读取元数据后加入草稿。
  async function addTargets(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    try {
      const prepared = await window.shredderApi.prepareShred(paths);
      if (prepared.length === 0) {
        Message.warning({ content: '没有可用的目标，请确认文件仍然存在' });
        return;
      }
      addPreparedTargets(prepared);
    } catch (error) {
      Message.error({ content: resolveErrorMessage(error) });
    }
  }
  // 从草稿与勾选集合中同时移除指定目标。
  function removeTargets(paths: string[]): void {
    targets.value = removeShredTargets(targets.value, paths);
    const removed = new Set(paths);
    selectedPaths.value = selectedPaths.value.filter(
      (path) => !removed.has(path),
    );
    // 目标清空后回到拖拽步骤，避免停留在空列表页面。
    if (targets.value.length === 0) step.value = 'select';
  }
  // 切换单个目标的勾选状态。
  function toggleTarget(path: string, checked: boolean): void {
    selectedPaths.value = toggleSelectedTarget(
      selectedPaths.value,
      path,
      checked,
    );
  }
  // 覆盖当前勾选的目标路径集合。
  function setSelectedPaths(paths: string[]): void {
    selectedPaths.value = paths;
  }
  // 移除当前勾选的全部目标。
  function removeSelectedTargets(): void {
    removeTargets([...selectedPaths.value]);
  }
  // 请求开始清理，按设置决定是否先弹出确认弹窗。
  function requestShred(): void {
    if (selectedPaths.value.length === 0) {
      Message.warning({ content: '请先勾选需要清理的目标' });
      return;
    }
    if (!getSettings().confirmBeforeShred) {
      void confirmShred();
      return;
    }
    isConfirmVisible.value = true;
  }
  // 关闭清理确认弹窗。
  function dismissConfirm(): void {
    isConfirmVisible.value = false;
  }
  // 确认后启动主进程清理任务。
  async function confirmShred(): Promise<void> {
    isConfirmVisible.value = false;
    // 使用当前勾选快照发起任务，避免任务期间勾选变化影响目标集合。
    const targetPaths = [...selectedPaths.value];
    if (targetPaths.length === 0) return;
    resetProgressState();
    step.value = 'progress';
    try {
      results.value = await window.shredderApi.shred(targetPaths, passes.value);
    } catch (error) {
      Message.error({ content: resolveErrorMessage(error) });
      step.value = 'confirm';
    }
  }
  // 请求取消当前清理任务。
  async function cancelShred(): Promise<void> {
    try {
      await window.shredderApi.cancelShred();
    } catch (error) {
      Message.error({ content: resolveErrorMessage(error) });
    }
  }
  // 结束本次任务并回到拖拽步骤。
  function finishShred(): void {
    targets.value = [];
    selectedPaths.value = [];
    resetProgressState();
    step.value = 'select';
  }
  return {
    step,
    stepIndex,
    targets,
    selectedPaths,
    passes,
    progress,
    summary,
    results,
    details,
    isConfirmVisible,
    running,
    resultTone,
    addTargets,
    addPreparedTargets,
    removeTargets,
    toggleTarget,
    setSelectedPaths,
    removeSelectedTargets,
    requestShred,
    confirmShred,
    dismissConfirm,
    cancelShred,
    finishShred,
  };
}
// 创建上下文缺失时使用的空实现，保证注入侧字段完整且调用安全。
export function createFallbackShredTask(): ShredTask {
  // 未提供上下文时统一返回空值。
  const noop = (): void => undefined;
  return {
    step: ref<ShredStep>('select'),
    stepIndex: computed(() => 0),
    targets: ref<ShredDraftTarget[]>([]),
    selectedPaths: ref<string[]>([]),
    passes: ref<ShredPasses>(0),
    progress: ref<ShredProgress | null>(null),
    summary: ref<ShredSummary | null>(null),
    results: ref<ShredResult[]>([]),
    details: ref<ShredDetailRow[]>([]),
    isConfirmVisible: ref(false),
    running: computed(() => false),
    resultTone: computed<ShredResultTone>(() => 'warning'),
    addTargets: async () => undefined,
    addPreparedTargets: noop,
    removeTargets: noop,
    toggleTarget: noop,
    setSelectedPaths: noop,
    removeSelectedTargets: noop,
    requestShred: noop,
    confirmShred: async () => undefined,
    dismissConfirm: noop,
    cancelShred: async () => undefined,
    finishShred: noop,
  };
}
// 计算文件级进度的百分比，供进度页直接绑定环形进度组件。
export function resolveProgressPercent(progress: ShredProgress | null): number {
  return resolveFilePercent(progress);
}
