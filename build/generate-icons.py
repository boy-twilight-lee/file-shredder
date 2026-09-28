"""一次性生成渲染进程所需 SVG 图标资源。

图标分四类：
1. 文件类型图标（9 个，32×32，多色）
2. 通用图标（若干，16×16，currentColor）
3. 侧边导航图标（4 个，24×24，currentColor）
4. 插画（4 个，拖拽区与结果三态）
"""

from __future__ import annotations

import sys
from pathlib import Path

# 图标输出目录。
ICON_DIR = Path(__file__).resolve().parent.parent / "src" / "assets" / "icons"

# 页形轮廓：左侧折叠角保留 2px 圆角，右上角折角。
PAGE_PATH = "M6 2h14l8 8v18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
# 折角三角形，使用半透明白色表现纸张翻折。
FOLD_PATH = "M20 2l8 8h-6a2 2 0 0 1-2-2z"


def page_icon(color: str, inner: str) -> str:
    """生成统一的页形文件图标，inner 为页内的类型标识图形。"""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        f'<path d="{PAGE_PATH}" fill="{color}"/>'
        f'<path d="{FOLD_PATH}" fill="#fff" opacity=".45"/>'
        f"{inner}"
        "</svg>"
    )


def page_text(color: str, text: str) -> str:
    """生成带白色类型字符的页形图标。"""
    inner = (
        '<text x="16" y="23.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"'
        f' font-size="10" font-weight="700" fill="#fff" letter-spacing="-0.4">{text}</text>'
    )
    return page_icon(color, inner)


def illustration_circle(color: str, glyph: str) -> str:
    """生成结果三态插画：圆环底 + 白色状态图形。"""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 152 152">'
        '<circle cx="76" cy="76" r="60" fill="#ffffff"/>'
        f'<circle cx="76" cy="76" r="48" fill="{color}"/>'
        '<circle cx="76" cy="76" r="66" fill="none" stroke="#ffffff" stroke-width="2" '
        'stroke-dasharray="4 8" stroke-linecap="round"/>'
        f"{glyph}"
        "</svg>"
    )


ICONS: dict[str, str] = {
    # ---------- 文件类型图标 ----------
    "file-pdf.svg": page_text("#c93c72", "PDF"),
    "file-word.svg": page_text("#2b579a", "DOC"),
    "file-excel.svg": page_text("#217346", "XLS"),
    "file-ppt.svg": page_text("#d24726", "PPT"),
    "file-image.svg": page_icon(
        "#2ebabe",
        '<circle cx="12" cy="15" r="2.2" fill="#fff"/>'
        '<path d="M6 27l7-8.5 4 4.8 2.6-3.1L26 27z" fill="#fff"/>',
    ),
    "file-video.svg": page_icon(
        "#7b61ff",
        '<path d="M13.5 13.5l9.5 6.5-9.5 6.5z" fill="#fff"/>',
    ),
    "file-archive.svg": page_icon(
        "#ffb100",
        '<rect x="4" y="10" width="24" height="3.6" fill="#fff" opacity=".55"/>'
        '<rect x="15" y="15.4" width="2" height="3.4" fill="#fff"/>'
        '<rect x="15" y="20.6" width="2" height="3.4" fill="#fff"/>'
        '<rect x="15" y="25.8" width="2" height="3" fill="#fff"/>',
    ),
    "file-folder.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<path d="M4 9a2 2 0 0 1 2-2h7.2l2.2 3H26a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" '
        'fill="#0065ff"/>'
        '<path d="M4 13h24v2H4z" fill="#fff" opacity=".28"/>'
        "</svg>"
    ),
    "file-text.svg": page_icon(
        "#99a1ad",
        '<rect x="8" y="14" width="16" height="2" rx="1" fill="#fff"/>'
        '<rect x="8" y="19" width="16" height="2" rx="1" fill="#fff"/>'
        '<rect x="8" y="24" width="10" height="2" rx="1" fill="#fff"/>',
    ),
    # ---------- 通用图标 ----------
    "icon-remove.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" '
        'stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-success.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M3.2 8.6l3.2 3.2 6.4-7.6" fill="none" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
        "</svg>"
    ),
    "icon-failure.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" fill="none" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-arrow.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" '
        'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        "</svg>"
    ),
    "icon-close.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" '
        'stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-info.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.4"/>'
        '<path d="M8 7.2v4.2M8 4.9v.1" stroke="currentColor" stroke-width="1.5" '
        'stroke-linecap="round"/>'
        "</svg>"
    ),
    # ---------- 窗口控制图标 ----------
    "icon-window-minimize.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M3.4 8h9.2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-window-maximize.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<rect x="3.4" y="3.4" width="9.2" height="9.2" rx="1.6" fill="none" '
        'stroke="currentColor" stroke-width="1"/>'
        "</svg>"
    ),
    "icon-window-restore.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<rect x="5.6" y="3.4" width="7" height="7" rx="1.4" fill="none" '
        'stroke="currentColor" stroke-width="1"/>'
        '<path d="M10.4 12.6H4.8a1.4 1.4 0 0 1-1.4-1.4V5.6" fill="none" '
        'stroke="currentColor" stroke-width="1"/>'
        "</svg>"
    ),
    "icon-window-close.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
        '<path d="M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2" stroke="currentColor" '
        'stroke-width="1" stroke-linecap="round"/>'
        "</svg>"
    ),
    # ---------- 侧边导航图标 ----------
    "icon-nav-shred.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        '<path d="M8.5 9.5V5.4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v4.1" fill="none" '
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        '<rect x="3.6" y="9.5" width="16.8" height="5.6" rx="1.6" fill="none" '
        'stroke="currentColor" stroke-width="1.6"/>'
        '<path d="M8 17.4v2.2M12 17.4v3M16 17.4v2.2" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-nav-records.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        '<path d="M4.6 6.5h2.2M4.6 12h2.2M4.6 17.5h2.2M10 6.5h9.4M10 12h9.4M10 17.5h6" '
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-nav-settings.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        '<circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/>'
        '<path d="M12 3.4v2.3M12 18.3v2.3M3.4 12h2.3M18.3 12h2.3M6.4 6.4l1.6 1.6'
        'M16 16l1.6 1.6M17.6 6.4L16 8M8 16l-1.6 1.6" stroke="currentColor" '
        'stroke-width="1.6" stroke-linecap="round"/>'
        "</svg>"
    ),
    "icon-nav-about.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'
        '<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.6"/>'
        '<path d="M12 10.8v5.6M12 7.6v.1" stroke="currentColor" stroke-width="1.8" '
        'stroke-linecap="round"/>'
        "</svg>"
    ),
    # ---------- 插画 ----------
    "illustration-drop.svg": (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 240">'
        "<defs>"
        '<radialGradient id="dropGlow" cx="0.5" cy="0.45" r="0.55">'
        '<stop offset="0%" stop-color="#0065ff" stop-opacity=".16"/>'
        '<stop offset="100%" stop-color="#0065ff" stop-opacity="0"/>'
        "</radialGradient>"
        "</defs>"
        '<ellipse cx="170" cy="118" rx="150" ry="106" fill="url(#dropGlow)"/>'
        '<circle cx="170" cy="112" r="74" fill="#ffffff"/>'
        '<circle cx="170" cy="112" r="62" fill="#ebf3ff"/>'
        '<circle cx="170" cy="112" r="74" fill="none" stroke="#cce0ff" stroke-width="2"/>'
        '<path d="M62 158h48" stroke="#cce0ff" stroke-width="6" stroke-linecap="round"/>'
        '<path d="M230 66h48" stroke="#cce0ff" stroke-width="6" stroke-linecap="round"/>'
        '<rect x="120" y="52" width="100" height="120" rx="10" fill="#ffffff" '
        'stroke="#cce0ff" stroke-width="2"/>'
        '<path d="M120 74h100" stroke="#e1e5eb" stroke-width="2"/>'
        '<circle cx="132" cy="63" r="4" fill="#cce0ff"/>'
        '<circle cx="145" cy="63" r="4" fill="#cce0ff"/>'
        '<rect x="134" y="88" width="72" height="8" rx="4" fill="#ebf3ff"/>'
        '<rect x="134" y="104" width="52" height="8" rx="4" fill="#ebf3ff"/>'
        '<rect x="134" y="120" width="62" height="8" rx="4" fill="#ebf3ff"/>'
        '<rect x="134" y="142" width="72" height="10" rx="5" fill="#e1e5eb"/>'
        '<rect x="134" y="142" width="46" height="10" rx="5" fill="#0065ff"/>'
        '<g transform="rotate(-14 74 74)">'
        '<rect x="52" y="52" width="44" height="44" rx="10" fill="#26a555" opacity=".14"/>'
        '<path d="M66 78l6-7 5 5 4-5 6 7z" fill="#26a555"/>'
        '<circle cx="66" cy="66" r="3.2" fill="#26a555"/>'
        "</g>"
        '<g transform="rotate(12 268 168)">'
        '<rect x="246" y="146" width="44" height="44" rx="10" fill="#7666fb" opacity=".14"/>'
        '<path d="M258 168l8-6 8 6-8 6z" fill="#7666fb"/>'
        "</g>"
        '<g transform="rotate(8 274 62)">'
        '<rect x="252" y="40" width="44" height="44" rx="10" fill="#ff7d00" opacity=".14"/>'
        '<path d="M262 68V56h24v12z" fill="#ff7d00"/>'
        '<path d="M266 52h16v4h-16z" fill="#ff7d00"/>'
        "</g>"
        '<g transform="rotate(-8 66 172)">'
        '<rect x="44" y="150" width="44" height="44" rx="10" fill="#ff4c26" opacity=".14"/>'
        '<path d="M58 164h16l6 6v12H58z" fill="#ff4c26"/>'
        '<path d="M74 164v6h6" fill="#fff"/>'
        "</g>"
        "</svg>"
    ),
    "illustration-success.svg": illustration_circle(
        "#26a555",
        '<path d="M55 77.5l14 14 27-32" fill="none" stroke="#fff" stroke-width="9" '
        'stroke-linecap="round" stroke-linejoin="round"/>',
    ),
    "illustration-warning.svg": illustration_circle(
        "#ff7d00",
        '<path d="M76 52v30" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'
        '<path d="M76 94v.2" stroke="#fff" stroke-width="10" stroke-linecap="round"/>',
    ),
    "illustration-failure.svg": illustration_circle(
        "#ff4c26",
        '<path d="M58 58l36 36M94 58L58 94" fill="none" stroke="#fff" stroke-width="9" '
        'stroke-linecap="round"/>',
    ),
}


def main() -> int:
    """将全部图标写入资源目录，并输出写入数量。"""
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    for name, content in ICONS.items():
        (ICON_DIR / name).write_text(content, encoding="utf-8")
        written += 1
    print(f"written {written} icons to {ICON_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
