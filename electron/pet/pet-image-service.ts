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

const BUILT_IN_PET_IMAGES = [
  {
    id: 'built-in-ao-yin',
    name: '敖隐',
    fileName: 'ao-yin.webp',
  },
] as const;
const PET_TEMPLATE_THUMBNAIL_WIDTH = 192;
const PET_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
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
  private readonly thumbnailCache = new Map<string, string>();

  constructor(
    private readonly store: AppStore,
    private readonly dependencies: PetImageServiceDependencies,
  ) {}

  private getImagesDirectory(): string {
    return join(app.getPath('userData'), 'pet-templates');
  }

  private getBuiltInImagePath(fileName: string): string {
    return app.isPackaged
      ? join(process.resourcesPath, 'pet-templates', fileName)
      : join(app.getAppPath(), 'src', 'assets', 'pet-templates', fileName);
  }

  private getUploadedImagePath(image: UploadedPetImage): string {
    return join(this.getImagesDirectory(), image.fileName);
  }

  private imagePathToDataUrl(imagePath: string): string {
    if (!imagePath || !existsSync(imagePath)) return '';
    const mimeType = PET_IMAGE_MIME_TYPES[extname(imagePath).toLowerCase()];
    if (!mimeType) return '';
    try {
      // 保留原始图片数据，避免 GIF 动画在 nativeImage 转码后变成静态首帧。
      return `data:${mimeType};base64,${readFileSync(imagePath).toString('base64')}`;
    } catch {
      return '';
    }
  }

  private imagePathToThumbnailDataUrl(imagePath: string): string {
    if (!imagePath || !existsSync(imagePath)) return '';
    const cachedImage = this.thumbnailCache.get(imagePath);
    if (cachedImage) return cachedImage;
    const image = nativeImage.createFromPath(imagePath);
    if (image.isEmpty()) return this.imagePathToDataUrl(imagePath);
    // 设置页只传输小尺寸预览，避免通过 IPC 反复传递完整图片。
    const thumbnail = image
      .resize({ width: PET_TEMPLATE_THUMBNAIL_WIDTH, quality: 'good' })
      .toDataURL();
    this.thumbnailCache.set(imagePath, thumbnail);
    return thumbnail;
  }

  private isValidImage(fileExtension: string, imageBuffer: Buffer): boolean {
    if (fileExtension === '.svg') {
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

  private async updateSettings(
    patch: Partial<AppSettings>,
  ): Promise<AppSettings> {
    const settings = await this.store.updateSettings(patch);
    this.dependencies.onSettingsUpdated(settings);
    this.dependencies.notifyAppearanceChanged();
    return settings;
  }

  getActiveImagePath(): string {
    const settings = this.dependencies.getSettings();
    const builtIn = BUILT_IN_PET_IMAGES.find(
      (image) => image.id === settings.petImageTemplateId,
    );
    if (builtIn) return this.getBuiltInImagePath(builtIn.fileName);
    const uploaded = settings.uploadedPetImages.find(
      (image) => image.id === settings.petImageTemplateId,
    );
    if (uploaded) return this.getUploadedImagePath(uploaded);
    if (settings.customPetImagePath && existsSync(settings.customPetImagePath))
      return settings.customPetImagePath;
    return this.getBuiltInImagePath(BUILT_IN_PET_IMAGES[0].fileName);
  }

  getImageDataUrl(): string {
    return this.imagePathToDataUrl(this.getActiveImagePath());
  }

  getTemplates(): PetImageTemplate[] {
    const settings = this.dependencies.getSettings();
    const activeId = settings.petImageTemplateId;
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

  async migrateLegacyImage(): Promise<void> {
    const settings = this.dependencies.getSettings();
    if (
      !settings.customPetImagePath ||
      !existsSync(settings.customPetImagePath) ||
      settings.uploadedPetImages.length > 0
    )
      return;
    const id = randomUUID();
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

  async chooseImage(): Promise<PetImageTemplate[] | null> {
    try {
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
      const sourcePath = result.filePaths[0];
      const fileExtension = extname(sourcePath).toLowerCase();
      if (!PET_IMAGE_MIME_TYPES[fileExtension])
        throw new Error('仅支持 PNG、JPG、JPEG、SVG、WebP 和 GIF 图片');
      const sourceStats = await stat(sourcePath);
      if (sourceStats.size > PET_IMAGE_MAX_BYTES)
        throw new Error('桌宠图片不能超过 50 MB');
      const imageBuffer = await readFile(sourcePath);
      if (imageBuffer.byteLength > PET_IMAGE_MAX_BYTES)
        throw new Error('桌宠图片不能超过 50 MB');
      if (!this.isValidImage(fileExtension, imageBuffer))
        throw new Error('图片文件已损坏或格式与扩展名不符');
      const id = randomUUID();
      // 保留扩展名才能让 Chromium 按原格式解码，并继续播放 GIF 动画。
      const fileName = `${id}${fileExtension}`;
      await mkdir(this.getImagesDirectory(), { recursive: true });
      await copyFile(sourcePath, join(this.getImagesDirectory(), fileName));
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

  async selectImage(id: unknown): Promise<PetImageTemplate[]> {
    if (typeof id !== 'string') throw new Error('无效的桌宠模板');
    const settings = this.dependencies.getSettings();
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

  async deleteImage(id: unknown): Promise<PetImageTemplate[]> {
    if (typeof id !== 'string') throw new Error('无效的桌宠模板');
    const settings = this.dependencies.getSettings();
    const target = settings.uploadedPetImages.find((image) => image.id === id);
    if (!target) throw new Error('内置模板不能删除');
    await rm(this.getUploadedImagePath(target), { force: true });
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
