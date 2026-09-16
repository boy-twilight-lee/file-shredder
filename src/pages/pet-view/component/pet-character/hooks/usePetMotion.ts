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
  // 松手后先展示收脚静态帧，防止角色继续原地走动。
  const isSettling = ref(false);
  // 短暂事件中断先继续步行动画，避免抖动反复重播。
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  // 收脚短暂停留后恢复当前页面的业务动作。
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  // 清理停止和恢复两个阶段，新的拖动可立即打断停留。
  function clearTimers(): void {
    clearTimeout(stopTimer);
    clearTimeout(restoreTimer);
  }
  // 释放方向覆盖，使确认、结果或进度状态重新展示。
  function restore(): void {
    direction.value = null;
    isSettling.value = false;
  }
  // 从循环步行动画切换到同朝向的收脚姿势。
  function settle(): void {
    if (direction.value === null) return;
    isSettling.value = true;
    restoreTimer = setTimeout(restore, PET_MOTION_TIMING.rest);
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
      if (!isSettling.value && direction.value !== null) {
        clearTimeout(stopTimer);
        stopTimer = setTimeout(settle, PET_MOTION_TIMING.release);
      }
      return;
    }
    clearTimers();
    isSettling.value = false;
    direction.value = next;
    stopTimer = setTimeout(settle, PET_MOTION_TIMING.silence);
  }
  // 同方向原生事件不改变姿势键，动态 WebP 持续播放。
  watch([motion, enabled], updateMotion, { flush: 'sync' });
  // 卸载后取消尚未执行的方向恢复回调。
  onBeforeUnmount(clearTimers);
  return { direction, isSettling };
}
