"""Render anchored 24fps limb animation from approved HD key poses, without frame blending."""
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CELL_SIZE = 512
FPS = 24
COLUMNS = 15


def load_key_poses() -> list[Image.Image]:
    """Read the source key atlas, preserving its layout independently of runtime assets."""
    source = ROOT / 'docs/pet-assets/key-atlas.webp'
    with Image.open(source) as atlas:
        return [atlas.crop(((index % 7) * 640, (index // 7) * 640, (index % 7 + 1) * 640, (index // 7 + 1) * 640)).convert('RGBA') for index in range(40)]


def deform_pose(pose: Image.Image, fields: list[tuple]) -> Image.Image:
    """Inverse-warp one complete image using compact limb fields; never overlay poses."""
    pixels = np.asarray(pose).astype(np.float32) / 255
    height, width = pixels.shape[:2]
    grid_y, grid_x = np.mgrid[:height, :width].astype(np.float32)
    map_x, map_y = grid_x.copy(), grid_y.copy()
    for center_x, center_y, radius_x, radius_y, delta_x, delta_y in fields:
        distance = ((grid_x - center_x) / radius_x) ** 2 + ((grid_y - center_y) / radius_y) ** 2
        weight = np.maximum(0, 1 - distance) ** 2
        map_x -= weight * delta_x
        map_y -= weight * delta_y
    # Premultiply alpha before resampling to avoid dark outlines on transparent edges.
    pixels[:, :, :3] *= pixels[:, :, 3:4]
    warped = cv2.remap(pixels, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
    warped = np.clip(warped, 0, 1)
    warped[:, :, :3] /= np.maximum(warped[:, :, 3:4], 1 / 255)
    warped[warped[:, :, 3] < 1 / 255] = 0
    return Image.fromarray((np.clip(warped, 0, 1) * 255).astype(np.uint8)).resize((CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS)


def render_cycle(pose: Image.Image, name: str, count: int) -> list[Image.Image]:
    """Sample continuous local gestures at 24fps with fixed torso/waist/fruit pixels."""
    frames = []
    for index in range(count):
        phase = index / count * math.tau
        swing = math.sin(phase)
        sway = math.sin(phase + 0.6)
        if name == 'idle':
            fields = [(155, 414, 94, 66, 10 * swing, -18 * swing), (191, 390, 70, 50, 4 * sway, -5 * sway)]
        elif name == 'right':
            fields = [(228, 563, 72, 48, 10 * swing, -7 * (1 - math.cos(phase))), (411, 561, 73, 50, -10 * swing, -7 * (1 + math.cos(phase))), (170, 413, 68, 55, 5 * swing, -5 * sway)]
        elif name == 'working':
            fields = [(271, 391, 60, 59, 7 * swing, 4 * sway), (351, 391, 60, 59, -7 * swing, -4 * sway)]
        elif name == 'success':
            fields = [(168, 363, 68, 74, 5 * swing, -10 * sway)]
        elif name == 'failure':
            fields = [(163, 425, 56, 43, 3 * swing, 5 * sway), (473, 426, 56, 43, -3 * swing, 5 * sway)]
        elif name == 'waiting':
            fields = [(268, 399, 59, 58, 4 * swing, 3 * sway), (348, 399, 59, 58, -4 * swing, 3 * sway)]
        elif name == 'review':
            fields = [(220, 395, 72, 65, 5 * swing, -6 * sway)]
        else:
            raise ValueError(f'Unknown animation: {name}')
        frames.append(deform_pose(pose, fields))
    return frames


def build() -> dict:
    """Pack every actual rendered frame and generate the renderer's single layout source."""
    poses = load_key_poses()
    # Frame counts are exact multiples of the selected duration at 24fps.
    definitions = [('idle', 32, 48, True), ('right', 4, 18, True), ('working', 8, 24, True), ('success', 12, 24, False), ('failure', 14, 24, False), ('waiting', 16, 24, True), ('review', 18, 24, True)]
    frames, animations, cycles = [], {}, {}
    for name, pose_index, count, loop in definitions:
        cycle = render_cycle(poses[pose_index], name, count)
        cycles[name] = cycle
        animations[name] = {'frames': list(range(len(frames), len(frames) + count)), 'durationMs': count * 1000 / FPS, 'loop': loop}
        frames.extend(cycle)
    left = [ImageOps.mirror(frame) for frame in cycles['right']]
    animations['left'] = {'frames': list(range(len(frames), len(frames) + len(left))), 'durationMs': 750, 'loop': True}
    frames.extend(left)
    look_start = len(frames)
    frames.extend(poses[index].resize((CELL_SIZE, CELL_SIZE), Image.Resampling.LANCZOS) for index in [4, 23, 21, 31, 24, 30, 20, 22])
    animations['rest-right'] = {'frames': [look_start], 'durationMs': 650, 'loop': False}
    animations['rest-left'] = {'frames': [look_start + 4], 'durationMs': 650, 'loop': False}
    rows = math.ceil(len(frames) / COLUMNS)
    atlas = Image.new('RGBA', (CELL_SIZE * COLUMNS, CELL_SIZE * rows))
    for index, frame in enumerate(frames):
        atlas.paste(frame, ((index % COLUMNS) * CELL_SIZE, (index // COLUMNS) * CELL_SIZE))
    destination = ROOT / 'src/assets/pet-templates'
    atlas.save(destination / 'default-pet-atlas.webp', 'WEBP', lossless=True, method=4, exact=True)
    layout = {'cell_size': CELL_SIZE, 'columns': COLUMNS, 'rows': rows, 'frame_count': len(frames), 'fps': FPS, 'animations': animations, 'look_frames': list(range(look_start, look_start + 8))}
    (destination / 'default-pet-atlas.json').write_text(json.dumps(layout, indent=2) + '\n', encoding='utf-8')
    frames[0].save(destination / 'default-pet-preview.png')
    preview = ROOT / 'docs/pet-assets'
    for name, cycle in cycles.items():
        cycle[0].save(preview / f'{name}-24fps.webp', 'WEBP', save_all=True, append_images=cycle[1:], duration=[42, 42, 41] * (len(cycle) // 3), loop=0, lossless=True, method=4)
    report = {'success': True, 'fps': FPS, 'frame_count': len(frames), 'texture': list(atlas.size), 'bytes': (destination / 'default-pet-atlas.webp').stat().st_size, 'cycles': {name: len(cycle) for name, cycle in cycles.items()}}
    (preview / '24fps-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


def main() -> None:
    """Return structured failures for image IO and pose validation."""
    try:
        print(json.dumps(build()))
    except (OSError, ValueError, cv2.error) as error:
        print(json.dumps({'success': False, 'error': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
