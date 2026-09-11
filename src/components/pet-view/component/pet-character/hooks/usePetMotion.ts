import { Ref } from 'vue';
import { PetMotion } from '@/type';
import { getStablePetDirection } from '@/utils';
import { PET_MOTION_TIMING } from '../constants';
// 只消费原生移动事件，统一方向稳定、停步和恢复业务动作的时序。
export function usePetMotion(
  motion: Ref<PetMotion | null>,
  enabled: Ref<boolean>,
) {
  // 保存经过方向滞回过滤的视觉朝向。
  const direction = ref<number | null>(null);
  // 停步后先保持收脚姿势，再回到当前业务状态。
  const isSettling = ref(false);
  // 相邻方向需持续一小段时间，避免单次鼠标噪声重启动画。
  let candidate: number | null = null;
  // 记录候选方向开始时间，真实反向移动则立即切换。
  let candidateSince = 0;
  // 原生事件短暂中断时继续当前步态。
  let stopTimer: ReturnType<typeof setTimeout> | undefined;
  // 收脚停留结束后释放方向覆盖。
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  // 清理两个阶段的定时器，重新拖动可立即打断收脚。
  function clearTimers(): void {
    clearTimeout(stopTimer);
    clearTimeout(restoreTimer);
  }
  // 恢复清理、确认或待机等当前业务动作。
  function restore(): void {
    direction.value = null;
    isSettling.value = false;
    candidate = null;
  }
  // 先收脚并短暂停留，避免鼠标松开就突然变回正面。
  function settle(): void {
    if (direction.value === null) return;
    isSettling.value = true;
    restoreTimer = setTimeout(restore, PET_MOTION_TIMING.rest);
  }
  // 同一原生事件流管理方向和超时，避免屏幕坐标采样反向覆盖。
  function updateMotion(): void {
    if (!enabled.value) {
      clearTimers();
      restore();
      return;
    }
    // 过滤微小位移，并对方向边界增加滞回。
    const next = getStablePetDirection(motion.value, direction.value);
    if (next === null) {
      if (!isSettling.value && direction.value !== null) {
        clearTimeout(stopTimer);
        stopTimer = setTimeout(settle, PET_MOTION_TIMING.release);
      }
      return;
    }
    clearTimers();
    isSettling.value = false;
    // 对明显反向拖动即时响应，相邻方向需稳定后才切换。
    const distance =
      direction.value === null ? 0 : Math.abs(next - direction.value);
    if (direction.value === null || Math.min(distance, 8 - distance) >= 3) {
      direction.value = next;
      candidate = null;
    } else if (next !== direction.value) {
      if (candidate !== next) {
        candidate = next;
        candidateSince = performance.now();
      } else if (
        performance.now() - candidateSince >=
        PET_MOTION_TIMING.direction
      ) {
        direction.value = next;
        candidate = null;
      }
    } else candidate = null;
    stopTimer = setTimeout(settle, PET_MOTION_TIMING.silence);
  }
  // 原生事件到达即更新反馈；连续同向事件不改变动画键。
  watch([motion, enabled], updateMotion, { flush: 'sync' });
  // 卸载后禁止残留回调更新已销毁的角色。
  onBeforeUnmount(clearTimers);
  return { direction, isSettling };
}
