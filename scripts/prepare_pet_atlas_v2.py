"""Build a single transparent hip-aligned atlas, without blending frames."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from prepare_pet_atlas import remove_chroma_key

CELL_SIZE = 640
ATLAS_COLUMNS = 7
SOURCE_NAMES = ('idle', 'walk', 'working', 'reactions', 'social', 'look')
ROOT = Path(__file__).resolve().parents[1]


def align_pose(pose: Image.Image) -> tuple[Image.Image, dict]:
    """Anchor orange waistband independently of moving hands and feet."""
    pixels = np.asarray(pose).astype(np.float32)
    red, green, blue, alpha = (pixels[:, :, index] for index in range(4))
    orange = (red > green * 1.6) & (green > blue * 1.4) & (alpha > 192)
    height, width = orange.shape
    central = orange[:, round(width * 0.44):round(width * 0.56)].mean(axis=1)
    candidates = np.where((central > 0.8) & (np.arange(height) > height * 0.65))[0]
    if not candidates.size:
        raise ValueError('Cannot locate waistband')
    waist_y = int(candidates[0])
    centers = []
    for row in orange[waist_y + 20:waist_y + 40]:
        xs = np.where(row)[0]
        if xs.size:
            centers.append((float(xs.min()) + float(xs.max())) / 2)
    if not centers:
        raise ValueError('Cannot locate hip center')
    hip_x = float(np.median(centers))
    offset = (round(CELL_SIZE / 2 - hip_x), 470 - waist_y)
    box = pose.getchannel('A').point(lambda value: 255 if value > 128 else 0).getbbox()
    if not box or min(box[0] + offset[0], box[1] + offset[1]) < 2 or max(box[2] + offset[0], box[3] + offset[1]) > CELL_SIZE - 2:
        raise ValueError(f'Clipped character: {box}, {offset}')
    canvas = Image.new('RGBA', (CELL_SIZE, CELL_SIZE))
    canvas.alpha_composite(pose, offset)
    return canvas, {'hip_x': hip_x + offset[0], 'waist_y': waist_y + offset[1]}


def build() -> dict:
    """Pack all states and mirrored directions into the same lossless texture."""
    source_directory = ROOT / 'docs/pet-assets/sources-v2'
    destination = ROOT / 'src/assets/pet-templates'
    frames, anchors = [], []
    for name in SOURCE_NAMES:
        with Image.open(source_directory / f'{name}.png') as source:
            for index in range(4):
                column, row = index % 2, index // 2
                bounds = (column * source.width // 2, row * source.height // 2, (column + 1) * source.width // 2, (row + 1) * source.height // 2)
                pose, anchor = align_pose(remove_chroma_key(source.crop(bounds)))
                frames.append(pose)
                anchors.append({'source': name, 'pose': index, **anchor})
    frames.extend(ImageOps.mirror(frame) for frame in frames[4:8])
    frames.extend(ImageOps.mirror(frame) for frame in frames[20:24])
    with Image.open(source_directory / 'idle-hands.png') as source:
        for index in range(4):
            column, row = index % 2, index // 2
            bounds = (column * source.width // 2, row * source.height // 2, (column + 1) * source.width // 2, (row + 1) * source.height // 2)
            pose, anchor = align_pose(remove_chroma_key(source.crop(bounds)))
            frames.append(pose)
            anchors.append({'source': 'idle-hands', 'pose': index, **anchor})
    with Image.open(source_directory / 'idle-between.png') as source:
        for index in range(4):
            column, row = index % 2, index // 2
            bounds = (column * source.width // 2, row * source.height // 2, (column + 1) * source.width // 2, (row + 1) * source.height // 2)
            pose, anchor = align_pose(remove_chroma_key(source.crop(bounds)))
            frames.append(pose)
            anchors.append({'source': 'idle-between', 'pose': index, **anchor})
    atlas_rows = (len(frames) + ATLAS_COLUMNS - 1) // ATLAS_COLUMNS
    atlas = Image.new('RGBA', (CELL_SIZE * ATLAS_COLUMNS, CELL_SIZE * atlas_rows))
    for index, frame in enumerate(frames):
        atlas.alpha_composite(frame, ((index % ATLAS_COLUMNS) * CELL_SIZE, (index // ATLAS_COLUMNS) * CELL_SIZE))
    atlas.save(destination / 'default-pet-atlas.webp', 'WEBP', lossless=True, method=6, exact=True)
    frames[0].save(destination / 'default-pet-preview.png', optimize=True)
    layout = {'cell_size': CELL_SIZE, 'columns': ATLAS_COLUMNS, 'rows': atlas_rows, 'frame_count': len(frames)}
    (destination / 'default-pet-atlas.json').write_text(json.dumps(layout, indent=2) + '\n', encoding='utf-8')
    manifest = {**layout, 'anchors': anchors}
    (source_directory.parent / 'atlas-v2.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    contact = Image.new('RGB', (ATLAS_COLUMNS * 200, atlas_rows * 200), '#303743')
    for index, frame in enumerate(frames):
        thumb = frame.resize((200, 200), Image.Resampling.LANCZOS)
        contact.paste(thumb, ((index % ATLAS_COLUMNS) * 200, (index // ATLAS_COLUMNS) * 200), thumb)
    contact.save(source_directory.parent / 'atlas-v2-preview.jpg', quality=94)
    return {'success': True, **manifest, 'bytes': (destination / 'default-pet-atlas.webp').stat().st_size}


def main() -> None:
    """Report structured build errors."""
    try:
        print(json.dumps(build()))
    except (OSError, ValueError) as error:
        print(json.dumps({'success': False, 'error': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
