import { useEventListener } from '@vueuse/core';
// 统一控制拖拽按钮出现与消失的等待时间。
const DRAG_BUTTON_VISIBILITY_DELAY_MS = 150;
// 控制原生拖拽区域鼠标位置的同步频率。
const DRAG_BUTTON_HOVER_TRACK_INTERVAL_MS = 100;
// 通过触发元素与内容元素的原生事件管理拖拽按钮显隐。
export function useDragButtonVisibility(
  triggerElement: Ref<HTMLElement | null>,
  contentElement: Ref<HTMLElement | null>,
) {
  // 标识原生拖拽按钮当前是否显示。
  const isDragButtonVisible = ref(false);
  // 保存待执行的显隐任务，供快速移入移出时取消。
  let visibilityTimer = 0;
  // 保存当前等待执行的显隐目标，避免轮询重复延长消失时间。
  let pendingVisibility: boolean | null = null;
  // 保存下一次拖拽按钮命中检测任务。
  let hoverTrackingTimer = 0;
  // 标识组件是否已经销毁，避免异步坐标结果回写状态。
  let isDisposed = false;
  // 标识鼠标当前是否停留在触发元素内。
  let isTriggerHovered = false;
  // 标识鼠标当前是否停留在拖拽按钮内。
  let isContentHovered = false;
  // 在安排下一次状态前取消尚未执行的显隐任务。
  function clearVisibilityTimer(): void {
    if (!visibilityTimer) return;
    window.clearTimeout(visibilityTimer);
    visibilityTimer = 0;
    pendingVisibility = null;
  }
  // 取消下一次拖拽按钮命中检测任务。
  function clearHoverTrackingTimer(): void {
    if (!hoverTrackingTimer) return;
    window.clearTimeout(hoverTrackingTimer);
    hoverTrackingTimer = 0;
  }
  // 在指针停留达到指定时间后应用目标显隐状态。
  function applyVisibility(visible: boolean): void {
    isDragButtonVisible.value = visible;
    visibilityTimer = 0;
    pendingVisibility = null;
    if (visible) scheduleHoverTracking(0);
    else clearHoverTrackingTimer();
  }
  // 按 Arco Trigger 的可取消延迟模式安排一次显隐更新。
  function scheduleVisibility(visible: boolean, delay: number): void {
    if (pendingVisibility === visible) return;
    clearVisibilityTimer();
    if (visible === isDragButtonVisible.value) return;
    pendingVisibility = visible;
    visibilityTimer = window.setTimeout(applyVisibility, delay, visible);
  }
  // 判断窗口内坐标是否命中指定元素的实际边界。
  function containsCursorPoint(
    element: HTMLElement | null,
    point: { x: number; y: number },
  ): boolean {
    if (!element) return false;
    // 读取元素当前在窗口坐标系中的可交互边界。
    const bounds = element.getBoundingClientRect();
    return (
      point.x >= bounds.left &&
      point.x <= bounds.right &&
      point.y >= bounds.top &&
      point.y <= bounds.bottom
    );
  }
  // 安排下一次主进程鼠标命中检测。
  function scheduleHoverTracking(
    delay = DRAG_BUTTON_HOVER_TRACK_INTERVAL_MS,
  ): void {
    if (isDisposed || !isDragButtonVisible.value || hoverTrackingTimer) return;
    hoverTrackingTimer = window.setTimeout(syncHoverStateFromCursor, delay);
  }
  // 使用主进程鼠标坐标同步 trigger 与 content 的悬停状态。
  async function syncHoverStateFromCursor(): Promise<void> {
    hoverTrackingTimer = 0;
    try {
      // 获取指针在桌宠窗口内的实时坐标。
      const point = await window.shredderApi.getPetCursorPosition();
      if (isDisposed || !isDragButtonVisible.value || !point) return;
      isTriggerHovered = containsCursorPoint(triggerElement.value, point);
      isContentHovered = containsCursorPoint(contentElement.value, point);
      if (isTriggerHovered || isContentHovered) clearVisibilityTimer();
      else scheduleVisibility(false, DRAG_BUTTON_VISIBILITY_DELAY_MS);
    } catch {
      // IPC 暂不可用时保留原生事件结果，下一轮继续尝试同步。
    } finally {
      scheduleHoverTracking();
    }
  }
  // 鼠标进入触发元素 150ms 后显示拖拽按钮。
  function handleTriggerMouseEnter(): void {
    isTriggerHovered = true;
    scheduleVisibility(true, DRAG_BUTTON_VISIBILITY_DELAY_MS);
  }
  // 鼠标离开触发元素后，在未进入按钮时安排隐藏。
  function handleTriggerMouseLeave(): void {
    isTriggerHovered = false;
    if (isContentHovered) {
      clearVisibilityTimer();
      return;
    }
    scheduleVisibility(false, DRAG_BUTTON_VISIBILITY_DELAY_MS);
  }
  // 鼠标进入拖拽按钮时取消隐藏任务并持续显示。
  function handleContentMouseEnter(): void {
    isContentHovered = true;
    clearVisibilityTimer();
  }
  // 鼠标离开拖拽按钮后，在未回到触发元素时安排隐藏。
  function handleContentMouseLeave(): void {
    isContentHovered = false;
    if (isTriggerHovered) {
      clearVisibilityTimer();
      return;
    }
    scheduleVisibility(false, DRAG_BUTTON_VISIBILITY_DELAY_MS);
  }
  // 销毁组件时停止显隐与鼠标命中任务。
  function handleBeforeUnmount(): void {
    isDisposed = true;
    clearVisibilityTimer();
    clearHoverTrackingTimer();
  }
  useEventListener(triggerElement, 'mouseenter', handleTriggerMouseEnter);
  useEventListener(triggerElement, 'mouseleave', handleTriggerMouseLeave);
  useEventListener(contentElement, 'mouseenter', handleContentMouseEnter);
  useEventListener(contentElement, 'mouseleave', handleContentMouseLeave);
  onBeforeUnmount(handleBeforeUnmount);
  return { isDragButtonVisible };
}
