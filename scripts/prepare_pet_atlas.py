"""Build transparent HD pet animation sheets from the approved four-pose source images."""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


CELL_SIZE = 640
SOURCE_NAMES = ('idle', 'run-a', 'run-b', 'working', 'reactions', 'social', 'look')


def remove_chroma_key(image: Image.Image) -> Image.Image:
    """Remove magenta and its edge spill while preserving white bags and dark eyes."""
    rgb = np.asarray(image.convert('RGB'), dtype=np.float32)
    excess = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    alpha = 1 - np.clip((excess - 8) / 232, 0, 1)
    alpha[excess > 200] = 0
    background = np.array([255, 0, 255], dtype=np.float32)
    clean = (rgb - (1 - alpha[:, :, None]) * background) / np.maximum(alpha[:, :, None], 0.01)
    clean = np.clip(clean, 0, 255)
    rgba = np.dstack((clean, alpha * 255)).astype(np.uint8)
    rgba[alpha < 0.02] = 0
    return Image.fromarray(rgba, 'RGBA')


def read_poses(path: Path) -> list[Image.Image]:
    """Normalize the common canvas and baseline without distorting the character."""
    with Image.open(path) as source:
        poses = []
        for index in range(4):
            column, row = index % 2, index // 2
            bounds = (column * source.width // 2, row * source.height // 2, (column + 1) * source.width // 2, (row + 1) * source.height // 2)
            pose = remove_chroma_key(source.crop(bounds))
            box = pose.getchannel('A').point(lambda value: 255 if value > 128 else 0).getbbox()
            if not box:
                raise ValueError(f'Empty pose in {path}: {index}')
            poses.append(pose.crop(box))
    # All generated cells use the same camera scale; do not rescale each pose by its bounds.
    scale = 1.0
    normalized = []
    for pose in poses:
        alpha = np.asarray(pose.getchannel('A'))
        foot_region = alpha[round(pose.height * 0.88):, :] > 192
        foot_x = np.where(foot_region)[1]
        if not foot_x.size:
            raise ValueError(f'No foot anchor in {path}')
        foot_center = (float(foot_x.min()) + float(foot_x.max()) + 1) / 2
        pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (CELL_SIZE, CELL_SIZE))
        # Anchor feet, not the arm/head bounding box, so gestures cannot move the body.
        canvas.alpha_composite(pose, (round(CELL_SIZE / 2 - foot_center * scale), 590 - pose.height))
        normalized.append(canvas)
    return normalized


def hold_frames(poses: list[Image.Image]) -> list[Image.Image]:
    """Repeat only real key poses for timing; never blend or synthesize intermediate pixels."""
    if not poses or 16 % len(poses):
        raise ValueError('The key-pose count must divide sixteen')
    return [pose for pose in poses for _ in range(16 // len(poses))]


def save_sheet(frames: list[Image.Image], path: Path) -> None:
    """Pack sixteen cells into one bounded 2560px texture for compositor playback."""
    if len(frames) != 16:
        raise ValueError('Animation sheets require exactly sixteen cells')
    sheet = Image.new('RGBA', (CELL_SIZE * 4, CELL_SIZE * 4))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % 4) * CELL_SIZE, (index // 4) * CELL_SIZE))
    sheet.save(path, 'WEBP', quality=94, method=4, exact=True)


def build(source_directory: Path, destination: Path) -> dict:
    """Build state-specific textures, keeping only the active texture on the pet layer."""
    poses = {name: read_poses(source_directory / f'{name}.png') for name in SOURCE_NAMES}
    destination.mkdir(parents=True, exist_ok=True)
    idle = poses['idle']
    sequences = {
        'idle': [idle[index] for index in (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 0)],
        'facing': [poses['run-b'][3]],
        'working': poses['working'],
        'success': [poses['reactions'][0]],
        'waiting': poses['social'][:2],
        'review': poses['social'][2:],
    }
    for name, key_poses in sequences.items():
        save_sheet(hold_frames(key_poses), destination / f'default-pet-{name}.webp')
    failure = [poses['reactions'][2]] * 4 + [poses['reactions'][3]] * 12
    save_sheet(failure, destination / 'default-pet-failure.webp')
    looks = poses['look'] + [ImageOps.mirror(pose) for pose in poses['look']]
    save_sheet(looks + looks, destination / 'default-pet-look.webp')
    idle[0].save(destination / 'default-pet-preview.png', optimize=True)
    return {'success': True, 'cell_size': CELL_SIZE, 'texture_size': [2560, 2560], 'animations': len(sequences) + 2, 'key_poses': 28, 'output': str(destination.resolve())}


def main() -> None:
    """Read explicit source/destination directories and return structured errors."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.source, args.destination), ensure_ascii=False))
    except (OSError, ValueError) as error:
        print(json.dumps({'success': False, 'error': str(error)}, ensure_ascii=False))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
