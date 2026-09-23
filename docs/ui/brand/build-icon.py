# -*- coding: utf-8 -*-
"""从用户提供的品牌图（logo-src.jpg）生成全套应用图标。

    python docs/ui/brand/build-icon.py

产物（均落在本目录）：
    logo.png            512×512 圆角方砖主图，供 UI 稿 / 关于页使用
    icon-<size>.png     16/24/32/48/64/128/256 单尺寸图
    app-icon.ico        多尺寸 ICO（16~256）
    以上 512 与 ICO 同步写入 src/assets，供 electron-builder 打包使用。

为什么是位图而不是矢量：
    品牌图是一张 1920×1920 的 3D 渲染插画，原先那版 logo.svg 是按同一形象手绘的
    简化矢量，细节（体积光、垃圾桶格栅、文件夹叠层）都丢了。这里直接采用用户提供的
    原图，只做三件事：去水印、按插画包围盒裁成正方形、套圆角蒙版。

处理步骤（每一步都可复现，不要手工改图）：
    1. 抹掉右下角「豆包AI生成」水印。水印落在 x≥1480 / y≥1745 的纯背景区，
       逐行扫描确认该矩形内没有任何插画像素，直接填白即可，不需要修补算法。
    2. 插画包围盒实测 x[183,1760] y[288,1757]，中心 (971.5,1022.5)。
       以该中心取边长 1780 的正方形：四边留白 101 / 155，插画占宽 88.7%、
       占高 82.6%，四周留白均衡；底边 1912 仍在水印行 1745 之下、但已在第 1 步
       抹白，不会带出水印。
    3. 缩到 512（LANCZOS），套 24% 圆角蒙版（Windows / iOS 图标常用的圆角比例）。
"""

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SRC = HERE / 'logo-src.jpg'


def find_project_root(start):
    """向上查找含 package.json 的项目根。

    不要写死 `HERE.parent.parent`：本脚本在原型整理时从 docs/ui-prototype 迁到
    docs/ui/brand，层深变了，写死就会把产物写进 docs/src/assets。
    """
    for parent in (start, *start.parents):
        if (parent / 'package.json').is_file():
            return parent
    raise SystemExit('未找到项目根目录（沿途没有 package.json）')


ROOT = find_project_root(HERE)
SIZES = [512, 256, 128, 64, 48, 32, 24, 16]
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
# 水印矩形（已确认内部无插画像素）
WATERMARK_BOX = (1480, 1745, 1920, 1920)
# 以插画中心取的正方形裁切框
CROP_BOX = (82, 133, 1862, 1913)
# 圆角半径占边长比例
CORNER_RATIO = 0.24


def rounded_mask(size, ratio):
    """生成圆角矩形蒙版，四角外为全透明。"""
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=round(size * ratio), fill=255
    )
    return mask


def build_ico(master, sizes):
    """按 ICONDIR + ICONDIRENTRY*n + PNG 打包多尺寸 ICO。

    Pillow 的 ICO 写入只对 ≥256 的尺寸用 PNG，小尺寸会退化成未压缩 BMP，
    128px 一张就是 64KB。这里自己打包，全部用 PNG 条目（Vista 及以上支持），
    成品 30KB 左右，也与项目此前出货的 ICO 结构一致。
    """
    import io
    import struct

    from PIL import Image as _Image

    blobs = []
    for size in sizes:
        buf = io.BytesIO()
        master.resize((size, size), _Image.LANCZOS).save(
            buf, format='PNG', optimize=True, compress_level=9
        )
        blobs.append((size, buf.getvalue()))

    header = struct.pack('<HHH', 0, 1, len(blobs))
    offset = 6 + len(blobs) * 16
    entries, data = b'', b''
    for size, blob in blobs:
        dim = 0 if size >= 256 else size
        entries += struct.pack('<BBBBHHII', dim, dim, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
        data += blob
    return header + entries + data


def main():
    art = Image.open(SRC).convert('RGB')
    ImageDraw.Draw(art).rectangle(WATERMARK_BOX, fill=(255, 255, 255))

    square = art.crop(CROP_BOX)

    master = Image.new('RGBA', (512, 512))
    master.paste(square.resize((512, 512), Image.LANCZOS), (0, 0))
    master.putalpha(rounded_mask(512, CORNER_RATIO))

    master.save(HERE / 'logo.png')
    print('PNG   logo.png 512px')

    for size in SIZES:
        if size == 512:
            continue
        icon = master.resize((size, size), Image.LANCZOS)
        icon.save(HERE / f'icon-{size}.png')
        print(f'PNG   icon-{size}.png')

    (HERE / 'app-icon.ico').write_bytes(build_ico(master, ICO_SIZES))
    print('ICO   app-icon.ico')

    assets = ROOT / 'src' / 'assets'
    shutil.copyfile(HERE / 'logo.png', assets / 'app-icon.png')
    shutil.copyfile(HERE / 'app-icon.ico', assets / 'app-icon.ico')
    print('COPY  src/assets/app-icon.png')
    print('COPY  src/assets/app-icon.ico')


if __name__ == '__main__':
    main()
