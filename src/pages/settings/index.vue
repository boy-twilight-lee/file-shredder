<template>
  <div class="settings-page">
    <div class="settings-card">
      <div class="settings-card-header">
        <span class="settings-card-title">清理设置</span>
      </div>
      <setting-row
        title="默认清理级别"
        description="新建清理任务时默认使用的数据覆写强度"
      >
        <a-radio-group
          type="button"
          :model-value="settings.passes"
          @change="handlePassesChange"
        >
          <a-radio
            v-for="option in passesOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }} {{ option.value }} 遍
          </a-radio>
        </a-radio-group>
      </setting-row>
      <setting-row
        title="删除根目录"
        description="清理文件夹时一并删除所选文件夹本身"
      >
        <a-switch
          :model-value="settings.removeRootDirectory"
          @change="handleToggle('removeRootDirectory', $event)"
        />
      </setting-row>
      <setting-row
        title="执行前确认"
        description="开始清理前弹出确认，避免误操作"
      >
        <a-switch
          :model-value="settings.confirmBeforeShred"
          @change="handleToggle('confirmBeforeShred', $event)"
        />
      </setting-row>
    </div>
    <div class="settings-card">
      <div class="settings-card-header">
        <span class="settings-card-title">界面与窗口</span>
      </div>
      <setting-row
        title="窗口置顶"
        description="窗口始终显示在其他程序之上"
      >
        <a-switch
          :model-value="settings.alwaysOnTop"
          @change="handleToggle('alwaysOnTop', $event)"
        />
      </setting-row>
      <setting-row
        title="记忆窗口位置"
        description="下次启动时恢复上次的窗口位置与大小"
      >
        <a-switch
          :model-value="settings.rememberWindowPosition"
          @change="handleToggle('rememberWindowPosition', $event)"
        />
      </setting-row>
    </div>
    <div class="settings-card">
      <div class="settings-card-header">
        <span class="settings-card-title">系统集成</span>
      </div>
      <setting-row
        title="开机自启"
        description="登录系统后自动启动文件粉碎精灵"
      >
        <a-switch
          :model-value="settings.launchAtLogin"
          @change="handleToggle('launchAtLogin', $event)"
        />
      </setting-row>
      <setting-row
        title="完成通知"
        description="清理任务结束后发送系统通知"
      >
        <a-switch
          :model-value="settings.systemNotifications"
          @change="handleToggle('systemNotifications', $event)"
        />
      </setting-row>
      <setting-row
        title="右键菜单"
        description="在资源管理器右键菜单中加入清理入口"
      >
        <a-switch
          :model-value="settings.contextMenuInstalled"
          @change="handleContextMenuChange"
        />
      </setting-row>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Message } from '@arco-design/web-vue';
import { computed, onMounted } from 'vue';
import { SHRED_PASSES_OPTIONS } from '@/constants';
import { useAppShellContext } from '@/layout';
import { AppSettings, SettingBooleanKey } from '@/type';
import { isShredPasses, resolveErrorMessage } from '@/utils';
import SettingRow from './component/setting-row';
defineOptions({
  name: 'SettingsPage',
});
// 读取外壳上下文中的应用设置。
const { appSettings } = useAppShellContext().inject();
// 默认清理级别的可选分段项。
const passesOptions = SHRED_PASSES_OPTIONS;
// 当前生效的应用设置。
const settings = computed(() => appSettings.settings.value);
// 切换默认清理级别并即时保存。
async function handlePassesChange(
  value: string | number | boolean,
): Promise<void> {
  // 仅接受受支持的清理级别，其余取值忽略。
  if (!isShredPasses(value)) return;
  await appSettings.update({ passes: value });
}
// 切换布尔设置并即时保存，失败时由设置状态层回滚界面。
async function handleToggle(
  key: SettingBooleanKey,
  value: string | number | boolean,
): Promise<void> {
  // 动态键名无法被类型系统收窄到具体设置字段，此处按键名写入布尔补丁。
  await appSettings.update({ [key]: Boolean(value) } as Partial<AppSettings>);
}
// 切换右键菜单开关，实际执行注册或卸载后回写真实状态。
async function handleContextMenuChange(
  value: string | number | boolean,
): Promise<void> {
  try {
    // 由主进程完成注册表写入，并返回实际生效的状态。
    const installed = Boolean(value)
      ? await window.shredderApi.installContextMenu()
      : await window.shredderApi.removeContextMenu();
    await appSettings.update({ contextMenuInstalled: installed });
  } catch (error) {
    Message.error({ content: resolveErrorMessage(error) });
    await appSettings.syncContextMenuStatus();
  }
}
// 进入设置页时以系统实际状态校准右键菜单开关。
onMounted(() => {
  appSettings.syncContextMenuStatus();
});
</script>
<style lang="less" scoped>
@import './index.less';
</style>
