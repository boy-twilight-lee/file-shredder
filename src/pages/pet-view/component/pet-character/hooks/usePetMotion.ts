import { Ref } from 'vue';
import { PetMotion } from '@/type';
import { getHorizontalPetDirection } from '@/utils';
import { PET_MOTION_TIMING } from '../constants';
// 原生窗口负责移动，角色仅响应左右朝向并在停止后恢复业务姿势。
export function usePetMotion(
  motion: Ref<PetMotion | null>,
  enabled: Ref<boolean>,
) {
  // 保存当前水平朝向，不再产生上下或斜向姿势。
  const direction = ref<'left' | 'right' | null>(null);
  // 短暂事件中断先继续步行动画，避免抖动反复重播。
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  // 清理停止阶段，新的拖动可立即打断释放缓冲。
  function clearTimers(): void {
    clearTimeout(stopTimer);
    stopTimer = undefined;
  }
  // 释放方向覆盖，使确认、结果或进度状态重新展示。
  function restore(): void {
    direction.value = null;
  }
  // 停止移动后恢复当前页面的业务姿势。
  function settle(): void {
    if (direction.value === null) return;
    stopTimer = undefined;
    restore();
  }
  // 只按水平位移更新朝向，纵向变化不会重新加载动画。
  function updateMotion(): void {
    if (!enabled.value) {
      clearTimers();
      restore();
      return;
    }
    // 垂直拖动延续已有朝向；停止事件进入释放缓冲。
    const next = getHorizontalPetDirection(motion.value, direction.value);
    if (next === null) {
      if (direction.value !== null && stopTimer === undefined) {
        clearTimeout(stopTimer);
        stopTimer = setTimeout(settle, PET_MOTION_TIMING.release);
      }
      return;
    }
    clearTimers();
    direction.value = next;
    stopTimer = setTimeout(settle, PET_MOTION_TIMING.silence);
  }
  // 同方向原生事件不改变姿势键，动态 WebP 持续播放。
  watch([motion, enabled], updateMotion, { flush: 'sync' });
  // 卸载后取消尚未执行的方向恢复回调。
  onBeforeUnmount(clearTimers);
  return { direction };
}
