import { Notification } from 'electron';
import { getIconPath } from '../app';

export function showShredCompletionNotification(
  succeeded: number,
  failed: number,
  durationMs: number,
): void {
  if (!Notification.isSupported()) return;
  new Notification({
    title: '文件清理完成',
    body: `清理成功${succeeded}个文件/文件夹，清理失败${failed}个文件，耗时${(durationMs / 1000).toFixed(1)}s`,
    icon: getIconPath(),
  }).show();
}
