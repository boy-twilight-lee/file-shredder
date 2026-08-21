<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import type { AppSettings, SettingBooleanKey, ShredLog } from '@/type';
import defaultPetImage from '@/assets/pet.png';

const defaultSettings: AppSettings = {
  shortcut: 'CommandOrControl+Shift+Delete',
  passes: 3,
  confirmBeforeShred: true,
  alwaysOnTop: true,
  launchAtLogin: false,
  contextMenuInstalled: false,
  contextMenuAutoInstall: false,
  customPetImagePath: '',
  petSize: 200,
};
const settings = ref<AppSettings>({ ...defaultSettings });
const petImageSource = ref(defaultPetImage);
const logs = ref<ShredLog[]>([]);
const isLoading = ref(true);
const isChoosingPetImage = ref(false);
const switchOptions: Array<{ key: SettingBooleanKey; label: string; description: string }> = [
  { key: 'alwaysOnTop', label: '桌宠始终置顶', description: '让人物保持在普通窗口上方' },
  { key: 'launchAtLogin', label: '开机自动启动', description: '登录 Windows 后在后台启动并启用快捷键' },
  { key: 'contextMenuInstalled', label: '资源管理器右键菜单', description: '在文件和文件夹右键菜单中添加“桌宠文件强力粉碎”' },
];
const disposers: Array<() => void> = [];
let petSizeSaveTimer: ReturnType<typeof setTimeout> | undefined;

async function refreshData(): Promise<void> {
  const [storedSettings, contextMenuInstalled, storedLogs, customPetImage] = await Promise.all([
    window.shredderApi.getSettings(),
    window.shredderApi.getContextMenuStatus(),
    window.shredderApi.getLogs(),
    window.shredderApi.getPetImage(),
  ]);
  settings.value = { ...storedSettings, contextMenuInstalled };
  petImageSource.value = customPetImage || defaultPetImage;
  logs.value = storedLogs;
  isLoading.value = false;
}

async function saveSettingsPatch(patch: Partial<AppSettings>): Promise<void> {
  try {
    settings.value = await window.shredderApi.updateSettings(patch);
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '设置保存失败');
    settings.value = await window.shredderApi.getSettings();
  }
}

async function updateBooleanSetting(key: SettingBooleanKey, value: boolean | string | number): Promise<void> {
  await saveSettingsPatch({ [key]: Boolean(value) });
}

async function updateShortcut(value: string): Promise<void> {
  await saveSettingsPatch({ shortcut: value.trim() });
}

async function updatePasses(value: string | number | boolean): Promise<void> {
  if (value !== 3 && value !== 7 && value !== 35) return;
  await saveSettingsPatch({ passes: value });
}

function updatePetSize(value: number | [number, number]): void {
  if (Array.isArray(value)) return;
  settings.value.petSize = value;
  clearTimeout(petSizeSaveTimer);
  // 连续拖动滑块时合并磁盘写入，同时保持界面预览即时响应。
  petSizeSaveTimer = setTimeout(async () => {
    await saveSettingsPatch({ petSize: value });
  }, 120);
}

async function choosePetImage(): Promise<void> {
  isChoosingPetImage.value = true;
  try {
    const image = await window.shredderApi.choosePetImage();
    if (image) {
      petImageSource.value = image;
      settings.value = await window.shredderApi.getSettings();
      Message.success('桌宠形象已更新');
    }
  } catch (error) {
    Message.error(error instanceof Error ? error.message : 'PNG 图片读取失败');
  } finally {
    isChoosingPetImage.value = false;
  }
}

async function resetPetImage(): Promise<void> {
  await window.shredderApi.resetPetImage();
  petImageSource.value = defaultPetImage;
  settings.value = await window.shredderApi.getSettings();
}

async function clearLogs(): Promise<void> {
  await window.shredderApi.clearLogs();
  logs.value = [];
  Message.success('粉碎日志已清空');
}

function cleanupAndExit(): void {
  Modal.warning({
    title: '清理全部数据并退出',
    content: '将卸载资源管理器右键菜单、关闭开机自启，并删除全部设置和日志。免安装 EXE 不会被删除。',
    okText: '清理并退出',
    cancelText: '取消',
    hideCancel: false,
    onOk: () => window.shredderApi.cleanupAndExit(),
  });
}

onMounted(async () => {
  await refreshData();
  disposers.push(
    window.shredderApi.onSettingsChanged(refreshData),
    window.shredderApi.onLogsUpdated(refreshData),
  );
});

onBeforeUnmount(() => {
  clearTimeout(petSizeSaveTimer);
  disposers.forEach((dispose) => dispose());
});
</script>

<template>
  <main class="settings-view">
    <a-spin :loading="isLoading" class="settings-view-content">
      <a-tabs default-active-key="general" type="rounded">
        <a-tab-pane key="general" title="常规设置">
          <section class="settings-view-card">
            <h2>桌宠形象</h2>
            <div class="settings-view-pet-customizer">
              <div class="settings-view-pet-preview">
                <img
                  :src="petImageSource"
                  :style="{ width: `${Math.round(settings.petSize * 0.5)}px` }"
                  alt="桌宠形象预览"
                />
              </div>
              <div class="settings-view-pet-controls">
                <div class="settings-view-pet-upload">
                  <a-button type="primary" :loading="isChoosingPetImage" @click="choosePetImage">上传 PNG</a-button>
                  <a-button type="text" :disabled="!settings.customPetImagePath" @click="resetPetImage">恢复默认</a-button>
                </div>
                <span>建议使用透明背景 PNG，上传后立即应用。</span>
                <label>桌宠大小 <strong>{{ settings.petSize }} px</strong></label>
                <a-slider :model-value="settings.petSize" :min="120" :max="320" :step="4" @change="updatePetSize" />
              </div>
            </div>
          </section>

          <section class="settings-view-card">
            <h2>粉碎行为</h2>
            <a-form :model="settings" layout="vertical">
              <a-form-item label="全局快捷键" extra="使用 Electron Accelerator 格式，例如 CommandOrControl+Shift+Delete">
                <a-input v-model="settings.shortcut" size="large" @change="updateShortcut" />
              </a-form-item>
              <a-form-item label="随机数据覆写等级">
                <a-radio-group v-model="settings.passes" type="button" @change="updatePasses">
                  <a-radio :value="3">3 次 · 推荐</a-radio>
                  <a-radio :value="7">7 次 · 增强</a-radio>
                  <a-radio :value="35">35 次 · 极慢</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-form>
          </section>

          <section class="settings-view-card">
            <h2>桌宠与系统</h2>
            <div v-for="item in switchOptions" :key="item.key" class="settings-view-switch-row">
              <div><strong>{{ item.label }}</strong><span>{{ item.description }}</span></div>
              <a-switch :model-value="settings[item.key]" @change="updateBooleanSetting(item.key, $event)" />
            </div>
          </section>
        </a-tab-pane>

        <a-tab-pane key="logs" title="粉碎日志">
          <section class="settings-view-card">
            <div class="settings-view-card-title"><h2>最近记录</h2><a-button type="text" status="danger" @click="clearLogs">清空日志</a-button></div>
            <a-list :data="logs" :max-height="390" size="small">
              <template #item="{ item }">
                <a-list-item>
                  <a-list-item-meta :title="item.path" :description="`${new Date(item.timestamp).toLocaleString()} · ${item.message}`" />
                  <template #actions><a-tag :color="item.success ? 'green' : 'red'">{{ item.success ? '成功' : '失败' }}</a-tag></template>
                </a-list-item>
              </template>
              <template #empty>还没有粉碎记录</template>
            </a-list>
          </section>
          <a-button type="text" status="danger" @click="cleanupAndExit">清理全部应用数据并退出</a-button>
        </a-tab-pane>
      </a-tabs>
    </a-spin>
  </main>
</template>

<style lang="less" scoped>
:global(*) { box-sizing: border-box; }
:global(html), :global(body), :global(#app) { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #f5f7fa; }

.settings-view {
  height: 100vh;
  padding: 20px 38px 42px;
  overflow-x: hidden;
  overflow-y: auto;
  color: #0d1014;

  .settings-view-content { display: block; min-height: 470px; padding-bottom: 8px; }
  .settings-view-card {
    margin-bottom: 16px;
    padding: 22px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 7px 24px rgba(30, 55, 90, 0.05);
    h2 { margin: 0 0 18px; font-size: 15px; font-weight: 600; }
  }

  .settings-view-switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 0;
    border-bottom: 1px solid #f2f5fa;
    &:last-child { border-bottom: 0; }
    strong, span { display: block; }
    strong { font-size: 14px; font-weight: 500; }
    span { margin-top: 3px; color: #99a1ad; font-size: 12px; }
  }

  .settings-view-pet-customizer { display: flex; gap: 22px; align-items: center; }
  .settings-view-pet-preview { display: flex; align-items: center; justify-content: center; width: 190px; height: 220px; overflow: hidden; border-radius: 12px; background: linear-gradient(135deg, #edf1f7 25%, transparent 25%) 0 0 / 16px 16px, linear-gradient(315deg, #edf1f7 25%, transparent 25%) 0 0 / 16px 16px, #fff; img { max-width: 176px; max-height: 208px; object-fit: contain; } }
  .settings-view-pet-controls { flex: 1; min-width: 0; span, label { display: block; } span { margin: 8px 0 22px; color: #99a1ad; font-size: 12px; } label { margin-bottom: 10px; color: #474f59; font-size: 13px; } label strong { float: right; color: #0065ff; } }
  .settings-view-pet-upload { display: flex; gap: 6px; align-items: center; }
  .settings-view-card-title { display: flex; align-items: center; justify-content: space-between; h2 { margin: 0; } }

  :deep(.arco-input-wrapper),
  :deep(.arco-btn),
  :deep(.arco-radio-button),
  :deep(.arco-tabs-tab) { border-radius: 8px; }
}
</style>
