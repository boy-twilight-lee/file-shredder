<template>
  <a-scrollbar
    class="general-settings-panel-scrollbar-container"
    outer-class="general-settings-panel-scrollbar"
    disable-horizontal
  >
    <div class="general-settings-panel">
      <section class="general-settings-panel-card">
        <div class="general-settings-panel-pet-heading">
          <h2>桌宠形象</h2>
          <p class="general-settings-panel-pet-tip">
            支持常用图片格式，单张不超过 50 MB。
          </p>
        </div>
        <div class="general-settings-panel-template-list">
          <button
            v-for="item in petImageTemplates"
            :key="item.id"
            type="button"
            class="general-settings-panel-template"
            :class="{
              'general-settings-panel-template-active': item.active,
            }"
            @click="emit('select-pet-image', item.id)"
          >
            <span class="general-settings-panel-template-preview"
              ><img
                :src="item.image"
                :alt="item.name"
            /></span>
            <span
              class="general-settings-panel-template-name"
              :title="item.name"
              >{{ item.name }}</span
            >
            <span
              v-if="item.active"
              class="general-settings-panel-template-selected"
              ><icon-check
            /></span>
            <a-popconfirm
              v-if="item.deletable"
              content="删除这个自定义形象？"
              content-class="settings-view-popconfirm"
              type="error"
              :ok-button-props="MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS"
              :cancel-button-props="MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS"
              @ok="emit('delete-pet-image', item.id)"
            >
              <span
                class="general-settings-panel-template-delete"
                title="删除"
                @click.stop
                ><icon-delete
              /></span>
            </a-popconfirm>
          </button>
          <button
            type="button"
            class="general-settings-panel-template general-settings-panel-template-upload"
            :disabled="isChoosingPetImage"
            @click="emit('choose-pet-image')"
          >
            <icon-plus />
            <span>{{ isChoosingPetImage ? '正在读取' : '上传图片' }}</span>
            <small>PNG · JPG · SVG · WebP · GIF</small>
          </button>
        </div>
        <div class="general-settings-panel-pet-size-section">
          <div class="general-settings-panel-pet-heading">
            <h2>桌宠大小</h2>
            <p class="general-settings-panel-pet-tip">调整桌宠显示大小。</p>
          </div>
          <div class="general-settings-panel-pet-controls">
            <a-slider
              class="general-settings-panel-pet-size-slider"
              :model-value="settings.petSize"
              :min="PET_SIZE_MIN"
              :max="PET_SIZE_MAX"
              :step="PET_SIZE_STEP"
              @change="updatePetSizeFromSlider"
            />
            <div class="general-settings-panel-pet-size-input">
              <a-input-number
                :model-value="settings.petSize"
                :min="PET_SIZE_MIN"
                :max="PET_SIZE_MAX"
                :step="PET_SIZE_STEP"
                hide-button
                @change="emit('update-pet-size', $event)"
              />
              <span>px</span>
            </div>
          </div>
        </div>
      </section>

      <section class="general-settings-panel-card">
        <h2>选择文件清理强度</h2>
        <p class="general-settings-panel-card-description">
          覆写次数越多越安全，处理时间也越长。
        </p>
        <div
          class="general-settings-panel-shred-level-list"
          role="radiogroup"
          aria-label="文件清理强度"
        >
          <button
            v-for="item in SHRED_LEVEL_OPTIONS"
            :key="item.value"
            type="button"
            role="radio"
            class="general-settings-panel-shred-level"
            :class="{
              'general-settings-panel-shred-level-active':
                settings.passes === item.value,
            }"
            :aria-checked="settings.passes === item.value"
            @click="emit('update-passes', item.value)"
          >
            <span class="general-settings-panel-shred-level-icon"
              ><component :is="shredLevelIcons[item.value]"
            /></span>
            <span class="general-settings-panel-shred-level-content">
              <span class="general-settings-panel-shred-level-title"
                ><strong>{{ item.title }}</strong
                ><em>{{ item.badge }}</em></span
              >
              <small>{{ item.description }}</small>
            </span>
            <span
              v-if="settings.passes === item.value"
              class="general-settings-panel-shred-level-check"
              ><icon-check
            /></span>
          </button>
        </div>
      </section>

      <section class="general-settings-panel-card">
        <h2>系统设置</h2>
        <p class="general-settings-panel-card-description">
          管理置顶、开机启动和右键菜单。
        </p>
        <div
          v-for="item in switchOptions"
          :key="item.key"
          class="general-settings-panel-switch-row"
        >
          <span class="general-settings-panel-switch-icon"
            ><component :is="item.icon"
          /></span>
          <div class="general-settings-panel-switch-content">
            <strong>{{ item.label }}</strong
            ><span>{{ item.description }}</span>
          </div>
          <a-switch
            :model-value="settings[item.key]"
            :before-change="(value) => onBeforeChange(item.key, value)"
          />
        </div>
      </section>
    </div>
  </a-scrollbar>
</template>

<script setup lang="ts">
import {
  IconDelete,
  IconMenu,
  IconNotification,
  IconPoweroff,
  IconPushpin,
  IconSafe,
  IconStorage,
  IconThunderbolt,
} from '@arco-design/web-vue/es/icon';
import type { AppSettings, PetImageTemplate, SettingBooleanKey } from '@/type';
import {
  MEDIUM_POPCONFIRM_CANCEL_BUTTON_PROPS,
  MEDIUM_POPCONFIRM_PRIMARY_BUTTON_PROPS,
  PET_SIZE_MAX,
  PET_SIZE_MIN,
  PET_SIZE_STEP,
  SHRED_LEVEL_OPTIONS,
} from '@/components/settings-view/constants';

defineProps<{
  settings: AppSettings;
  petImageTemplates: PetImageTemplate[];
  isChoosingPetImage: boolean;
  onBeforeChange: (
    key: SettingBooleanKey,
    value: boolean | string | number,
  ) => Promise<boolean>;
}>();
const emit = defineEmits<{
  'choose-pet-image': [];
  'select-pet-image': [id: string];
  'delete-pet-image': [id: string];
  'update-pet-size': [value: number | undefined];
  'update-passes': [value: AppSettings['passes']];
}>();

function updatePetSizeFromSlider(value: number | [number, number]): void {
  // 当前大小控件使用单值滑块，显式收窄 Arco Slider 的区间联合类型。
  if (typeof value === 'number') emit('update-pet-size', value);
}

const switchOptions: Array<{
  key: SettingBooleanKey;
  label: string;
  description: string;
  icon: Component;
}> = [
  {
    key: 'alwaysOnTop',
    label: '桌宠始终置顶',
    description: '保持桌宠显示在其他窗口上方',
    icon: IconPushpin,
  },
  {
    key: 'launchAtLogin',
    label: '开机自动启动',
    description: '登录 Windows 后自动运行',
    icon: IconPoweroff,
  },
  {
    key: 'systemNotifications',
    label: '开启系统通知',
    description: '清理完成后发送结果通知',
    icon: IconNotification,
  },
  {
    key: 'contextMenuInstalled',
    label: '资源管理器右键菜单',
    description: '添加文件和文件夹右键菜单',
    icon: IconMenu,
  },
];
const shredLevelIcons: Record<AppSettings['passes'], Component> = {
  0: IconDelete,
  3: IconThunderbolt,
  7: IconSafe,
  35: IconStorage,
};
</script>

<style lang="less" scoped>
@import './style/index.less';
</style>
