import { beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { AppSettings, AppStore } from '../storage';
import { PetImageService } from './pet-image-service';
// 模拟可用图片文件，验证选择逻辑而不依赖用户电脑上的真实图片。
const files = vi.hoisted(() => new Set<string>());
// 为图片服务提供稳定的开发目录和用户目录。
vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/user', getAppPath: () => '/app' },
  dialog: {},
  nativeImage: {},
}));
// 保留实际路径操作，仅隔离文件存在性和图片内容读取。
vi.mock('node:fs', () => ({
  existsSync: (path: string) => files.has(path),
  readFileSync: () => Buffer.from('image'),
}));
// 验证只有内置图片被标识为动作图集，自定义图片和缺失回退均保持正确。
describe('PetImageService appearance', () => {
  // 保存各测试使用的最小图片设置。
  let settings: AppSettings;
  // 保存独立图片服务实例。
  let service: PetImageService;
  // 为每个用例重置图片和设置。
  beforeEach(() => {
    files.clear();
    settings = {
      uploadedPetImages: [],
      customPetImagePath: '',
    } as unknown as AppSettings;
    service = new PetImageService({} as AppStore, {
      // 返回当前测试可修改的图片配置。
      getSettings: () => settings,
      // 本测试不修改持久化设置。
      onSettingsUpdated: () => {},
      // 本测试不发送外观通知。
      notifyAppearanceChanged: () => {},
      // 本测试不打开原生文件选择器。
      restoreSettingsBubble: () => {},
    });
    files.add(
      join('/app', 'src', 'assets', 'pet-templates', 'default-pet-preview.png'),
    );
  });
  // 首次启动必须返回真实存在的默认图集。
  it('uses the default atlas without an upload', () => {
    expect(service.getImageDataUrl()).toEqual({
      isDefault: true,
      image: expect.stringContaining('data:image/png;base64,'),
    });
  });
  // 上传的动态图片必须保留原始数据格式且不启用帧裁剪。
  it('keeps uploaded GIFs custom', () => {
    settings.uploadedPetImages = [{ id: 'custom', fileName: 'custom.gif' }];
    files.add(join('/user', 'pet-templates', 'custom.gif'));
    expect(service.getImageDataUrl()).toEqual({
      isDefault: false,
      image: expect.stringContaining('data:image/gif;base64,'),
    });
  });
  // 文件丢失时按实际生效路径启用默认动画。
  it('falls back to the atlas when an uploaded file is missing', () => {
    settings.uploadedPetImages = [{ id: 'missing', fileName: 'missing.png' }];
    expect(service.getImageDataUrl().isDefault).toBe(true);
  });
  // 老版本自定义路径也不应作为图集解析。
  it('preserves legacy custom images', () => {
    settings.customPetImagePath = '/legacy.png';
    files.add('/legacy.png');
    expect(service.getImageDataUrl().isDefault).toBe(false);
  });
});
