"""一次性生成安装器品牌位图（installer-header.bmp / installer-sidebar.bmp）。"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = r'D:\desktop\file-shredder\src\assets\app-icon.png'
HEADER_OUT = r'D:\desktop\file-shredder\build\installer-header.bmp'
SIDEBAR_OUT = r'D:\desktop\file-shredder\build\installer-sidebar.bmp'

FONT_BOLD = r'C:\Windows\Fonts\msyhbd.ttc'
FONT_REG = r'C:\Windows\Fonts\msyh.ttc'


def load_mascot(size):
    """读取图标并裁掉透明边距，等比缩放到目标边长。"""
    img = Image.open(SRC).convert('RGBA')
    bbox = img.split()[-1].getbbox()
    if bbox:
        img = img.crop(bbox)
    scale = size / max(img.size)
    target = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
    return img.resize(target, Image.LANCZOS)


def vertical_gradient(size, stops):
    """按给定色标生成竖直渐变。"""
    width, height = size
    img = Image.new('RGB', size)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        ratio = y / max(1, height - 1)
        for i in range(len(stops) - 1):
            pos_a, color_a = stops[i]
            pos_b, color_b = stops[i + 1]
            if pos_a <= ratio <= pos_b:
                local = 0 if pos_b == pos_a else (ratio - pos_a) / (pos_b - pos_a)
                color = tuple(
                    round(color_a[c] + (color_b[c] - color_a[c]) * local) for c in range(3)
                )
                draw.line([(0, y), (width, y)], fill=color)
                break
    return img


def build_header():
    """白色页眉 + 右侧应用图标，与参考安装器的页眉保持一致。"""
    canvas = Image.new('RGB', (150, 57), 'white')
    mascot = load_mascot(33)
    x = 150 - 15 - mascot.width
    y = (57 - mascot.height) // 2
    canvas.paste(mascot, (x, y), mascot)
    canvas.save(HEADER_OUT, 'BMP')
    print('header ->', HEADER_OUT, canvas.size)


def build_sidebar():
    """欢迎/完成页左侧品牌图：浅蓝渐变 + 图标 + 产品名。"""
    width, height = 164, 314
    canvas = vertical_gradient(
        (width, height),
        [
            (0.0, (245, 251, 255)),
            (0.34, (222, 240, 255)),
            (0.68, (191, 223, 253)),
            (1.0, (163, 207, 252)),
        ],
    )

    # 图标背后的柔和高光，让主体从渐变里浮出来。
    glow = Image.new('L', (width, height), 0)
    ImageDraw.Draw(glow).ellipse((16, 42, width - 16, 232), fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(26))
    canvas = Image.composite(Image.new('RGB', (width, height), 'white'), canvas, glow)

    mascot = load_mascot(112)
    canvas.paste(mascot, ((width - mascot.width) // 2, 62), mascot)

    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(FONT_BOLD, 21)
    tagline_font = ImageFont.truetype(FONT_REG, 11)

    title = '文件粉碎精灵'
    title_box = draw.textbbox((0, 0), title, font=title_font)
    draw.text(
        ((width - (title_box[2] - title_box[0])) / 2 - title_box[0], 226),
        title,
        font=title_font,
        fill=(19, 83, 156),
    )

    tagline = '彻底粉碎 · 不可恢复'
    tag_box = draw.textbbox((0, 0), tagline, font=tagline_font)
    draw.text(
        ((width - (tag_box[2] - tag_box[0])) / 2 - tag_box[0], 258),
        tagline,
        font=tagline_font,
        fill=(72, 126, 190),
    )

    # 品牌分隔线，与产品名呼应。
    draw.rectangle((57, 279, 107, 281), fill=(140, 190, 246))

    canvas.save(SIDEBAR_OUT, 'BMP')
    print('sidebar ->', SIDEBAR_OUT, canvas.size)


if __name__ == '__main__':
    build_header()
    build_sidebar()
