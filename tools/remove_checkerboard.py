"""Convert a light checkerboard-backed cutout into a real transparent PNG."""

from __future__ import annotations

import argparse
import binascii
import json
import struct
import zlib
from collections import deque
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _read_rgb_png(path: Path) -> tuple[int, int, bytearray]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("输入文件不是 PNG")

    offset = len(PNG_SIGNATURE)
    idat = bytearray()
    width = height = 0
    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        payload = data[offset + 8 : offset + 8 + length]
        offset += length + 12
        if chunk_type == b"IHDR":
            width, height, depth, color_type, _, _, interlace = struct.unpack(">IIBBBBB", payload)
            if (depth, color_type, interlace) != (8, 2, 0):
                raise ValueError("仅支持 8 位、非交错 RGB PNG")
        elif chunk_type == b"IDAT":
            idat.extend(payload)
        elif chunk_type == b"IEND":
            break

    compressed = zlib.decompress(bytes(idat))
    stride = width * 3
    pixels = bytearray(height * stride)
    previous = bytearray(stride)
    source_offset = 0
    for y in range(height):
        filter_type = compressed[source_offset]
        source_offset += 1
        scanline = bytearray(compressed[source_offset : source_offset + stride])
        source_offset += stride
        for x in range(stride):
            left = scanline[x - 3] if x >= 3 else 0
            up = previous[x]
            upper_left = previous[x - 3] if x >= 3 else 0
            if filter_type == 1:
                scanline[x] = (scanline[x] + left) & 0xFF
            elif filter_type == 2:
                scanline[x] = (scanline[x] + up) & 0xFF
            elif filter_type == 3:
                scanline[x] = (scanline[x] + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                estimate = left + up - upper_left
                distances = (abs(estimate - left), abs(estimate - up), abs(estimate - upper_left))
                predictor = (left, up, upper_left)[distances.index(min(distances))]
                scanline[x] = (scanline[x] + predictor) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"不支持的 PNG 过滤器: {filter_type}")
        pixels[y * stride : (y + 1) * stride] = scanline
        previous = scanline
    return width, height, pixels


def _is_background(pixels: bytearray, pixel_index: int) -> bool:
    offset = pixel_index * 3
    red, green, blue = pixels[offset : offset + 3]
    return min(red, green, blue) >= 205 and max(red, green, blue) - min(red, green, blue) <= 13


def _find_connected_background(width: int, height: int, pixels: bytearray) -> bytearray:
    background = bytearray(width * height)
    queue: deque[int] = deque()
    border_indices = [*(range(width)), *(range((height - 1) * width, height * width))]
    border_indices.extend(y * width for y in range(height))
    border_indices.extend(y * width + width - 1 for y in range(height))
    for pixel_index in border_indices:
        if not background[pixel_index] and _is_background(pixels, pixel_index):
            background[pixel_index] = 1
            queue.append(pixel_index)

    while queue:
        pixel_index = queue.popleft()
        x, y = pixel_index % width, pixel_index // width
        for neighbor_x, neighbor_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= neighbor_x < width and 0 <= neighbor_y < height:
                neighbor = neighbor_y * width + neighbor_x
                if not background[neighbor] and _is_background(pixels, neighbor):
                    background[neighbor] = 1
                    queue.append(neighbor)
    return background


def _chunk(chunk_type: bytes, payload: bytes) -> bytes:
    checksum = binascii.crc32(chunk_type + payload) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + chunk_type + payload + struct.pack(">I", checksum)


def convert(source: Path, destination: Path) -> dict[str, int | bool | str]:
    width, height, pixels = _read_rgb_png(source)
    background = _find_connected_background(width, height, pixels)
    rgba = bytearray()
    transparent_pixels = 0
    for y in range(height):
        rgba.append(0)
        for x in range(width):
            pixel_index = y * width + x
            offset = pixel_index * 3
            rgba.extend(pixels[offset : offset + 3])
            alpha = 0 if background[pixel_index] else 255
            rgba.append(alpha)
            transparent_pixels += alpha == 0

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    output = PNG_SIGNATURE + _chunk(b"IHDR", header) + _chunk(b"IDAT", zlib.compress(bytes(rgba), 9)) + _chunk(b"IEND", b"")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(output)
    return {
        "success": True,
        "path": str(destination),
        "width": width,
        "height": height,
        "transparent_pixels": transparent_pixels,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    arguments = parser.parse_args()
    try:
        print(json.dumps(convert(arguments.source, arguments.destination), ensure_ascii=False))
    except (OSError, ValueError, zlib.error) as error:
        print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False))
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
