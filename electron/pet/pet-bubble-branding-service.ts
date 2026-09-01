import { app, dialog, nativeImage } from 'electron';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppSettings, AppStore } from '../storage';
interface PetBubbleBrandingServiceDependencies {
  getSettings: () => AppSettings;
  onSettingsUpdated: (settings: AppSettings) => void;
  notifyBrandingChanged: () => void;
  restoreSettingsBubble: () => void;
}
// 限制操作气泡应用图标允许上传的最大字节数。
const BUBBLE_APP_ICON_MAX_BYTES = 5 * 1024 * 1024;
// 列出 Chromium 与 Electron 原生图片均稳定支持的图标扩展名。
const BUBBLE_APP_ICON_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
export class PetBubbleBrandingService {
  // 注入气泡品牌设置的存储与界面同步能力。
  constructor(
    private readonly store: AppStore,
    private readonly dependencies: PetBubbleBrandingServiceDependencies,
  ) {}
  // 返回自定义气泡图标的专用持久化目录。
  private getIconDirectory(): string {
    return join(app.getPath('userData'), 'bubble-branding');
  }
  // 判断设置中的路径是否属于应用管理的气泡图标目录。
  private isManagedIconPath(iconPath: string): boolean {
    if (!iconPath) return false;
    return resolve(dirname(iconPath)) === resolve(this.getIconDirectory());
  }
  // 持久化气泡品牌设置并通知渲染进程刷新。
  private async updateSettings(
    patch: Partial<AppSettings>,
  ): Promise<AppSettings> {
    // 保存更新后的完整应用设置。
    const settings = await this.store.updateSettings(patch);
    this.dependencies.onSettingsUpdated(settings);
    this.dependencies.notifyBrandingChanged();
    return settings;
  }
  // 将当前自定义图标转换为适合头部展示的数据地址。
  getIconDataUrl(): string {
    // 读取当前设置记录的自定义图标路径。
    const iconPath = this.dependencies.getSettings().bubbleAppIconPath;
    if (!this.isManagedIconPath(iconPath)) return '';
    // 通过 Electron 解码图片，避免直接向渲染进程暴露本地文件路径。
    const icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) return '';
    return icon.resize({ width: 96, height: 96, quality: 'good' }).toDataURL();
  }
  // 打开图片选择器并保存操作气泡的自定义应用图标。
  async chooseIcon(): Promise<string | null> {
    try {
      // 获取用户在原生文件选择器中的选择结果。
      const result = await dialog.showOpenDialog({
        title: '选择应用图标',
        properties: ['openFile'],
        filters: [
          {
            name: '支持的图片',
            extensions: ['png', 'jpg', 'jpeg', 'webp'],
          },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      // 保存用户选择的源图片路径。
      const sourcePath = result.filePaths[0];
      // 读取源文件扩展名供格式白名单校验与持久化使用。
      const fileExtension = extname(sourcePath).toLowerCase();
      if (!BUBBLE_APP_ICON_EXTENSIONS.includes(fileExtension))
        throw new Error('仅支持 PNG、JPG、JPEG 和 WebP 图片');
      // 读取源文件大小以在加载图片前拒绝过大的内容。
      const sourceStats = await stat(sourcePath);
      if (sourceStats.size > BUBBLE_APP_ICON_MAX_BYTES)
        throw new Error('应用图标不能超过 5 MB');
      // 读取并解码图片以验证内容确实是受支持的图片。
      const imageBuffer = await readFile(sourcePath);
      if (imageBuffer.byteLength > BUBBLE_APP_ICON_MAX_BYTES)
        throw new Error('应用图标不能超过 5 MB');
      // 验证图片内容能够由 Electron 正常解码。
      const image = nativeImage.createFromBuffer(imageBuffer);
      if (image.isEmpty()) throw new Error('图片文件已损坏或格式不受支持');
      // 创建新的受管图标文件名，确保写入成功前不影响当前图标。
      const fileName = `${randomUUID()}${fileExtension}`;
      // 保存图标的完整受管路径供设置持久化。
      const iconPath = join(this.getIconDirectory(), fileName);
      // 记录旧图标路径，供新图标保存成功后定向清理。
      const previousIconPath =
        this.dependencies.getSettings().bubbleAppIconPath;
      await mkdir(this.getIconDirectory(), { recursive: true });
      await writeFile(iconPath, imageBuffer);
      try {
        await this.updateSettings({ bubbleAppIconPath: iconPath });
      } catch (error) {
        await rm(iconPath, { force: true });
        throw error;
      }
      if (
        previousIconPath !== iconPath &&
        this.isManagedIconPath(previousIconPath)
      )
        await rm(previousIconPath, { force: true });
      return this.getIconDataUrl();
    } finally {
      // 原生文件选择器结束后恢复设置气泡，避免窗口失焦导致页面关闭。
      this.dependencies.restoreSettingsBubble();
    }
  }
  // 删除自定义气泡图标并恢复内置应用图标。
  async resetIcon(): Promise<string> {
    await rm(this.getIconDirectory(), { force: true, recursive: true });
    await this.updateSettings({ bubbleAppIconPath: '' });
    return '';
  }
}
