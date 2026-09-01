import { app, dialog, nativeImage } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppSettings, AppStore, UploadedPetImage } from '../storage';
export interface PetImageTemplate {
  id: string;
  name: string;
  image: string;
  builtIn: boolean;
  active: boolean;
  deletable: boolean;
}
interface PetImageServiceDependencies {
  getSettings: () => AppSettings;
  onSettingsUpdated: (settings: AppSettings) => void;
  notifyAppearanceChanged: () => void;
  restoreSettingsBubble: () => void;
}
// 定义随应用发布的内置桌宠形象。
const BUILT_IN_PET_IMAGES = [
  {
    id: 'built-in-ao-yin',
    name: '敖隐',
    fileName: 'ao-yin.webp',
  },
] as const;
// 限制设置页桌宠缩略图的传输宽度。
const PET_TEMPLATE_THUMBNAIL_WIDTH = 192;
// 限制用户上传桌宠图片的最大字节数。
const PET_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
// 映射支持的桌宠图片扩展名与 MIME 类型。
const PET_IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.jeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};
export class PetImageService {
  // 缓存设置页已经生成的桌宠缩略图。
  private readonly thumbnailCache = new Map<string, string>();
  // 注入桌宠形象存储与外部状态同步能力。
  constructor(
    private readonly store: AppStore,
    private readonly dependencies: PetImageServiceDependencies,
  ) {}
  // 返回用户上传桌宠形象的持久化目录。
  private getImagesDirectory(): string {
    return join(app.getPath('userData'), 'pet-templates');
  }
  // 返回当前运行环境中的内置桌宠图片路径。
  private getBuiltInImagePath(fileName: string): string {
    return app.isPackaged
      ? join(process.resourcesPath, 'pet-templates', fileName)
      : join(app.getAppPath(), 'src', 'assets', 'pet-templates', fileName);
  }
  // 返回指定用户桌宠形象的持久化路径。
  private getUploadedImagePath(image: UploadedPetImage): string {
    return join(this.getImagesDirectory(), image.fileName);
  }
  // 将本地图片原始数据转换为浏览器可用的数据地址。
  private imagePathToDataUrl(imagePath: string): string {
    if (!imagePath || !existsSync(imagePath)) return '';
    // 根据文件扩展名解析图片 MIME 类型。
    const mimeType = PET_IMAGE_MIME_TYPES[extname(imagePath).toLowerCase()];
    if (!mimeType) return '';
    try {
      // 保留原始图片数据，避免 GIF 动画在 nativeImage 转码后变成静态首帧。
      return `data:${mimeType};base64,${readFileSync(imagePath).toString('base64')}`;
    } catch {
      return '';
    }
  }
  // 生成并缓存设置页使用的小尺寸图片数据地址。
  private imagePathToThumbnailDataUrl(imagePath: string): string {
    if (!imagePath || !existsSync(imagePath)) return '';
    // 读取当前图片已经生成的缩略图缓存。
    const cachedImage = this.thumbnailCache.get(imagePath);
    if (cachedImage) return cachedImage;
    // 使用 Electron 原生图片 API 解码静态图片。
    const image = nativeImage.createFromPath(imagePath);
    if (image.isEmpty()) return this.imagePathToDataUrl(imagePath);
    // 设置页只传输小尺寸预览，避免通过 IPC 反复传递完整图片。
    // 将图片缩放为设置页需要的缩略图。
    const thumbnail = image
      .resize({ width: PET_TEMPLATE_THUMBNAIL_WIDTH, quality: 'good' })
      .toDataURL();
    this.thumbnailCache.set(imagePath, thumbnail);
    return thumbnail;
  }
  // 按文件签名验证图片内容与扩展名是否一致。
  private isValidImage(fileExtension: string, imageBuffer: Buffer): boolean {
    if (fileExtension === '.svg') {
      // 规范化 SVG 文本头以检查根元素。
      const content = imageBuffer
        .toString('utf8')
        .replace(/^\uFEFF/, '')
        .trimStart();
      return /^(?:<\?xml[^>]*>\s*)?(?:<!--[^]*?-->\s*)*<svg(?:\s|>)/i.test(
        content,
      );
    }
    if (fileExtension === '.png')
      return imageBuffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (['.jpg', '.jpeg', '.jeg'].includes(fileExtension))
      return (
        imageBuffer[0] === 0xff &&
        imageBuffer[1] === 0xd8 &&
        imageBuffer[2] === 0xff
      );
    if (fileExtension === '.gif')
      return ['GIF87a', 'GIF89a'].includes(
        imageBuffer.subarray(0, 6).toString('ascii'),
      );
    if (fileExtension === '.webp')
      return (
        imageBuffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        imageBuffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    return false;
  }
  // 持久化桌宠设置并通知所有外观消费者。
  private async updateSettings(
    patch: Partial<AppSettings>,
  ): Promise<AppSettings> {
    // 保存更新后的完整应用设置。
    const settings = await this.store.updateSettings(patch);
    this.dependencies.onSettingsUpdated(settings);
    this.dependencies.notifyAppearanceChanged();
    return settings;
  }
  // 解析当前生效的内置、上传或旧版桌宠图片路径。
  getActiveImagePath(): string {
    // 读取当前桌宠形象相关设置。
    const settings = this.dependencies.getSettings();
    // 查找当前选中的内置桌宠形象。
    const builtIn = BUILT_IN_PET_IMAGES.find(
      (image) => image.id === settings.petImageTemplateId,
    );
    if (builtIn) return this.getBuiltInImagePath(builtIn.fileName);
    // 查找当前选中的用户上传桌宠形象。
    const uploaded = settings.uploadedPetImages.find(
      (image) => image.id === settings.petImageTemplateId,
    );
    if (uploaded) return this.getUploadedImagePath(uploaded);
    if (settings.customPetImagePath && existsSync(settings.customPetImagePath))
      return settings.customPetImagePath;
    return this.getBuiltInImagePath(BUILT_IN_PET_IMAGES[0].fileName);
  }
  // 返回当前桌宠形象的完整数据地址。
  getImageDataUrl(): string {
    return this.imagePathToDataUrl(this.getActiveImagePath());
  }
  // 返回设置页展示的全部桌宠形象模板。
  getTemplates(): PetImageTemplate[] {
    // 读取当前桌宠形象列表与选择状态。
    const settings = this.dependencies.getSettings();
    // 保存当前选中的桌宠模板标识。
    const activeId = settings.petImageTemplateId;
    // 将内置形象映射为设置页模板数据。
    const builtInTemplates = BUILT_IN_PET_IMAGES.map((image) => ({
      id: image.id,
      name: image.name,
      image: this.imagePathToThumbnailDataUrl(
        this.getBuiltInImagePath(image.fileName),
      ),
      builtIn: true,
      active: image.id === activeId,
      deletable: false,
    }));
    // 过滤丢失文件并映射用户上传模板数据。
    const uploadedTemplates = settings.uploadedPetImages
      .filter((image) => existsSync(this.getUploadedImagePath(image)))
      .map((image) => ({
        id: image.id,
        name: image.name,
        image: this.imagePathToThumbnailDataUrl(
          this.getUploadedImagePath(image),
        ),
        builtIn: false,
        active: image.id === activeId,
        deletable: true,
      }));
    // 配置中的模板丢失时，界面和桌宠都回退到第一个内置形象。
    if (
      ![...builtInTemplates, ...uploadedTemplates].some((image) => image.active)
    )
      builtInTemplates[0].active = true;
    return [...builtInTemplates, ...uploadedTemplates];
  }
  // 将旧版本单张自定义图片迁移到模板目录。
  async migrateLegacyImage(): Promise<void> {
    // 读取判断迁移条件所需的当前设置。
    const settings = this.dependencies.getSettings();
    if (
      !settings.customPetImagePath ||
      !existsSync(settings.customPetImagePath) ||
      settings.uploadedPetImages.length > 0
    )
      return;
    // 为迁移后的模板生成唯一标识。
    const id = randomUUID();
    // 生成迁移图片在模板目录中的文件名。
    const fileName = `${id}.png`;
    await mkdir(this.getImagesDirectory(), { recursive: true });
    await copyFile(
      settings.customPetImagePath,
      join(this.getImagesDirectory(), fileName),
    );
    await this.updateSettings({
      customPetImagePath: '',
      petImageTemplateId: id,
      uploadedPetImages: [{ id, name: '我的桌宠', fileName }],
    });
  }
  // 打开文件选择器、校验并保存用户桌宠图片。
  async chooseImage(): Promise<PetImageTemplate[] | null> {
    try {
      // 获取用户在原生文件选择器中的选择结果。
      const result = await dialog.showOpenDialog({
        title: '选择桌宠图片',
        properties: ['openFile'],
        filters: [
          {
            name: '支持的图片',
            extensions: ['png', 'jpg', 'jpeg', 'jeg', 'svg', 'webp', 'gif'],
          },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      // 保存用户选择的源图片路径。
      const sourcePath = result.filePaths[0];
      // 提取并规范化源图片扩展名。
      const fileExtension = extname(sourcePath).toLowerCase();
      if (!PET_IMAGE_MIME_TYPES[fileExtension])
        throw new Error('仅支持 PNG、JPG、JPEG、SVG、WebP 和 GIF 图片');
      // 读取源图片文件大小供复制前快速校验。
      const sourceStats = await stat(sourcePath);
      if (sourceStats.size > PET_IMAGE_MAX_BYTES)
        throw new Error('桌宠图片不能超过 50 MB');
      // 读取图片原始数据供完整大小与签名校验。
      const imageBuffer = await readFile(sourcePath);
      if (imageBuffer.byteLength > PET_IMAGE_MAX_BYTES)
        throw new Error('桌宠图片不能超过 50 MB');
      if (!this.isValidImage(fileExtension, imageBuffer))
        throw new Error('图片文件已损坏或格式与扩展名不符');
      // 为新上传的桌宠模板生成唯一标识。
      const id = randomUUID();
      // 保留扩展名才能让 Chromium 按原格式解码，并继续播放 GIF 动画。
      // 生成新模板的持久化文件名。
      const fileName = `${id}${fileExtension}`;
      await mkdir(this.getImagesDirectory(), { recursive: true });
      await copyFile(sourcePath, join(this.getImagesDirectory(), fileName));
      // 将新模板追加到现有用户上传形象列表。
      const uploadedPetImages = [
        ...this.dependencies.getSettings().uploadedPetImages,
        {
          id,
          name: basename(sourcePath, fileExtension) || '我的桌宠',
          fileName,
        },
      ];
      await this.updateSettings({
        customPetImagePath: '',
        petImageTemplateId: id,
        uploadedPetImages,
      });
      return this.getTemplates();
    } finally {
      // 原生文件选择器会让透明窗口失焦，结束后恢复到设置气泡。
      this.dependencies.restoreSettingsBubble();
    }
  }
  // 将指定存在的模板设为当前桌宠形象。
  async selectImage(id: unknown): Promise<PetImageTemplate[]> {
    if (typeof id !== 'string') throw new Error('无效的桌宠模板');
    // 读取验证模板与更新选择状态所需的设置。
    const settings = this.dependencies.getSettings();
    // 标识模板是否属于有效内置或现存上传形象。
    const exists =
      BUILT_IN_PET_IMAGES.some((image) => image.id === id) ||
      settings.uploadedPetImages.some(
        (image) =>
          image.id === id && existsSync(this.getUploadedImagePath(image)),
      );
    if (!exists) throw new Error('桌宠模板不存在');
    await this.updateSettings({ petImageTemplateId: id });
    return this.getTemplates();
  }
  // 删除指定用户桌宠形象并回退失效选择。
  async deleteImage(id: unknown): Promise<PetImageTemplate[]> {
    if (typeof id !== 'string') throw new Error('无效的桌宠模板');
    // 读取用户上传形象及当前选择状态。
    const settings = this.dependencies.getSettings();
    // 查找用户请求删除的自定义模板。
    const target = settings.uploadedPetImages.find((image) => image.id === id);
    if (!target) throw new Error('内置模板不能删除');
    await rm(this.getUploadedImagePath(target), { force: true });
    // 从设置中移除已经删除的模板。
    const uploadedPetImages = settings.uploadedPetImages.filter(
      (image) => image.id !== id,
    );
    await this.updateSettings({
      petImageTemplateId:
        settings.petImageTemplateId === id
          ? BUILT_IN_PET_IMAGES[0].id
          : settings.petImageTemplateId,
      uploadedPetImages,
    });
    return this.getTemplates();
  }
}
