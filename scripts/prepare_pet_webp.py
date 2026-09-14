"""Build native animated WebP and static poses from the approved pet artwork."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps

from pet_image_utils import remove_chroma_key

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / 'src/assets/pet-templates/motions'
DOCUMENTS = ROOT / 'docs/pet-assets'
SIZE = 640
LOADING_FRAMES = 120
ANIMATION_DURATIONS = {'idle': 5000, 'working': 5000, 'success': 5000, 'failure': 5000, 'left': 720, 'right': 720}


def load_poses() -> list[Image.Image]:
    """Extract original 640px poses rather than the old deformed 512px atlas."""
    with Image.open(DOCUMENTS / 'key-atlas.webp') as atlas:
        return [atlas.crop((index % 7 * SIZE, index // 7 * SIZE,
                            (index % 7 + 1) * SIZE, (index // 7 + 1) * SIZE))
                .convert('RGBA') for index in range(40)]


def prepare_generated(name: str) -> Image.Image:
    """Remove the generated chroma background and match the original camera scale."""
    with Image.open(DOCUMENTS / f'sources-v2/{name}.png') as source:
        pose = remove_chroma_key(source)
    # Match the 590px foot baseline and 20px fruit top; preserve aspect ratio.
    bounds = pose.getchannel('A').point(lambda alpha: 255 if alpha > 128 else 0).getbbox()
    if bounds is None:
        raise ValueError('The generated pose is empty')
    scale = 570 / (bounds[3] - bounds[1])
    pose = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.Resampling.LANCZOS)
    pixels = np.asarray(pose)
    foot_mask = pixels[round(bounds[3] * scale) - 45:round(bounds[3] * scale), :, 3] > 192
    foot_x = np.where(foot_mask)[1]
    if not foot_x.size:
        raise ValueError('The pointing pose has no foot anchor')
    center_x = (float(foot_x.min()) + float(foot_x.max())) / 2
    canvas = Image.new('RGBA', (SIZE, SIZE))
    canvas.alpha_composite(pose, (round(SIZE / 2 - center_x), 590 - round(bounds[3] * scale)))
    return canvas


def make_blink(open_pose: Image.Image, closed_pose: Image.Image) -> Image.Image:
    """Reuse closed-eye artwork only in the eye region, keeping body pixels fixed."""
    grid_y, grid_x = np.mgrid[:SIZE, :SIZE]
    mask = np.zeros((SIZE, SIZE), dtype=np.float32)
    for center_x in (251, 387):
        distance = ((grid_x - center_x) / 48) ** 2 + ((grid_y - 192) / 34) ** 2
        mask = np.maximum(mask, np.clip((1 - distance) * 5, 0, 1))
    return Image.composite(closed_pose, open_pose, Image.fromarray((mask * 255).astype(np.uint8)))


def expression_pose(base: Image.Image, expression: Image.Image, include_mouth: bool) -> Image.Image:
    """Reuse drawn eyes and mouth without changing the head contour, arms or body."""
    grid_y, grid_x = np.mgrid[:SIZE, :SIZE]
    mask = np.zeros((SIZE, SIZE), dtype=np.float32)
    regions = [(250, 191, 55, 49), (388, 191, 55, 49)]
    if include_mouth:
        regions.append((352, 316, 106, 39))
    for center_x, center_y, radius_x, radius_y in regions:
        distance = ((grid_x - center_x) / radius_x) ** 2 + ((grid_y - center_y) / radius_y) ** 2
        mask = np.maximum(mask, np.clip((1 - distance) * 6, 0, 1))
    return Image.composite(expression, base, Image.fromarray((mask * 255).astype(np.uint8)))


def smooth_step(value: float) -> float:
    """Ease paper acceleration without stretching or resampling the character."""
    value = min(1.0, max(0.0, value))
    return value * value * (3 - 2 * value)


def render_loading(pose: Image.Image) -> list[Image.Image]:
    """Animate rigid paper layers over an unchanged character and shredder."""
    frames = []
    scale = 3
    for index in range(LOADING_FRAMES):
        progress = index / LOADING_FRAMES
        overlay = Image.new('RGBA', (SIZE * scale, SIZE * scale))
        draw = ImageDraw.Draw(overlay)
        # Only the paper moves. Head, hands, arms, torso and feet are never warped.
        feed = smooth_step((progress - 0.16) / 0.48)
        opacity = round(255 * smooth_step(progress / 0.12))
        paper_top = 329 + 54 * feed
        if paper_top < 382 and opacity > 0:
            draw.rounded_rectangle(
                (282 * scale, paper_top * scale, 358 * scale, (paper_top + 54) * scale),
                radius=3 * scale, fill=(253, 252, 246, opacity),
                outline=(209, 218, 216, opacity), width=scale)
            for line in range(3):
                line_y = paper_top + 13 + line * 9
                if line_y < 380:
                    draw.line((294 * scale, line_y * scale,
                               (344 if line < 2 else 332) * scale, line_y * scale),
                              fill=(166, 185, 189, opacity), width=2 * scale)
            # The machine occludes the paper below its feed slot.
            draw.rectangle((0, 382 * scale, SIZE * scale, SIZE * scale), fill=(0, 0, 0, 0))
        # Paper strips fall only inside the existing collection window.
        for strip in range(6):
            local = (progress - 0.30 - strip * 0.025) / 0.48
            if 0 < local < 1:
                strip_top = 439 + 44 * local * local
                strip_bottom = min(470, strip_top + 17)
                strip_top = max(440, strip_top)
                if strip_top < strip_bottom:
                    alpha = round(220 * smooth_step(local / 0.12) * (1 - smooth_step((local - 0.80) / 0.20)))
                    strip_x = 276 + strip * 14
                    draw.rounded_rectangle(
                        (strip_x * scale, strip_top * scale, (strip_x + 6) * scale, strip_bottom * scale),
                        radius=scale, fill=(222, 235, 227, alpha))
        frame = pose.copy()
        frame.alpha_composite(overlay.resize((SIZE, SIZE), Image.Resampling.LANCZOS))
        frames.append(frame)
    return frames


def save_animation(name: str, frames: list[Image.Image], durations: list[int]) -> None:
    """Encode a transparent native WebP loop, preserving exact frame timing."""
    if len(frames) != len(durations) or sum(durations) != ANIMATION_DURATIONS[name]:
        raise ValueError(f'Invalid animation timing: {name}')
    frames[0].save(DESTINATION / f'{name}.webp', 'WEBP', save_all=True,
                   append_images=frames[1:], duration=durations, loop=0,
                   lossless=True, method=4, exact=True)


def validate_loading(frames: list[Image.Image]) -> None:
    """Reject character drift, accidental deformation and a discontinuous loop."""
    reference = np.asarray(frames[0])
    moving_region = np.zeros((SIZE, SIZE), dtype=bool)
    moving_region[325:386, 278:362] = True
    moving_region[436:475, 272:359] = True
    for index, frame in enumerate(frames):
        pixels = np.asarray(frame)
        if np.any(pixels[~moving_region] != reference[~moving_region]):
            raise ValueError(f'Character pixels moved outside the paper layers: {index}')
    if not np.array_equal(reference, np.asarray(frames[-1])):
        raise ValueError('The working loop does not return to its initial pose')


def validate_walking() -> None:
    """Ensure the encoded walk contains whole anchored poses, never spliced layers."""
    poses = load_poses()
    for name in ('right', 'left'):
        with Image.open(DESTINATION / f'{name}.webp') as animation:
            if animation.n_frames != 4:
                raise ValueError(f'Unexpected walking frame count: {name}')
            for index in range(4):
                animation.seek(index)
                actual = np.asarray(animation.convert('RGBA'))
                source = poses[index + 4]
                expected = np.asarray(ImageOps.mirror(source) if name == 'left' else source)
                opaque = expected[:, :, 3] > 0
                if not np.array_equal(actual[:, :, 3], expected[:, :, 3]) or not np.array_equal(actual[:, :, :3][opaque], expected[:, :, :3][opaque]):
                    raise ValueError(f'Walking frame is not a complete source pose: {name}, {index}')


def inspect_asset(path: Path) -> dict:
    """Validate actual encoded frames, transparency, bounds and loop duration."""
    with Image.open(path) as image:
        duration = 0
        bounds = []
        for index in range(image.n_frames):
            image.seek(index)
            frame = image.convert('RGBA')
            duration += image.info.get('duration', 0)
            box = frame.getchannel('A').point(lambda alpha: 255 if alpha > 128 else 0).getbbox()
            if box is None or min(box[:2]) < 2 or max(box[2:]) > SIZE - 2:
                raise ValueError(f'Clipped or empty frame: {path.name}, {index}, {box}')
            if frame.getpixel((0, 0))[3] != 0:
                raise ValueError(f'Nontransparent background: {path.name}')
            bounds.append(box)
        animated = path.stem in ANIMATION_DURATIONS
        if animated and (image.n_frames < 2 or duration != ANIMATION_DURATIONS[path.stem] or image.info.get('loop') != 0):
            raise ValueError(f'Invalid animated WebP: {path.name}, {duration}')
        if not animated and image.n_frames != 1:
            raise ValueError(f'Expected a static pose: {path.name}')
        return {'frames': image.n_frames, 'duration_ms': duration, 'size': list(image.size),
                'bytes': path.stat().st_size, 'bounds': bounds[0]}


def build() -> dict:
    """Create runtime assets, settings preview and a reviewable contact sheet."""
    DESTINATION.mkdir(parents=True, exist_ok=True)
    poses = load_poses()
    stills = {
        'actions': prepare_generated('actions-point'), 'waiting': prepare_generated('waiting-refined'), 'review': poses[18],
        'rest-right': poses[4], 'rest-left': poses[24],
    }
    for name, pose in stills.items():
        pose.save(DESTINATION / f'{name}.webp', 'WEBP', lossless=True, method=4, exact=True)
    idle = poses[0]
    blink = make_blink(idle, poses[2])
    save_animation('idle', [idle, blink, idle], [2850, 140, 2010])
    loading = render_loading(prepare_generated('working-shredder-refined'))
    validate_loading(loading)
    save_animation('working', loading, [42, 41, 42] * 40)
    idle.save(DESTINATION.parent / 'default-pet-preview.png', optimize=True)
    # All source poses share the same waist/hip anchor. Keep every pose whole:
    # splicing a fixed torso over a different lower body creates a visible seam.
    walking = [poses[index].copy() for index in (4, 5, 6, 7)]
    save_animation('right', walking, [180] * 4)
    save_animation('left', [ImageOps.mirror(frame) for frame in walking], [180] * 4)
    validate_walking()
    smile = expression_pose(poses[13], poses[12], include_mouth=True)
    save_animation('success', [smile, poses[13], smile], [1000, 1200, 2800])
    closed_eyes = expression_pose(poses[14], poses[15], include_mouth=False)
    sigh = expression_pose(poses[14], poses[15], include_mouth=True)
    save_animation('failure', [poses[14], closed_eyes, sigh, closed_eyes, poses[14]],
                   [1600, 140, 720, 180, 2360])
    names = set(stills) | set(ANIMATION_DURATIONS)
    report = {name: inspect_asset(DESTINATION / f'{name}.webp') for name in sorted(names)}
    contact_poses = [idle, blink, stills['actions'], stills['waiting'], walking[1],
                     ImageOps.mirror(walking[1]), poses[13], sigh,
                     loading[0], loading[30], loading[60], loading[90]]
    contact = Image.new('RGB', (4 * 220, 3 * 220), '#303743')
    for index, pose in enumerate(contact_poses):
        thumb = pose.resize((220, 220), Image.Resampling.LANCZOS)
        contact.paste(thumb, (index % 4 * 220, index // 4 * 220), thumb)
    contact.save(DOCUMENTS / 'webp-poses-preview.jpg', quality=94)
    (DOCUMENTS / 'webp-validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    return {'success': True, 'assets': report, 'total_bytes': sum(item['bytes'] for item in report.values())}


def main() -> None:
    """Return structured build errors suitable for local or CI execution."""
    try:
        print(json.dumps(build()))
    except (OSError, ValueError) as error:
        print(json.dumps({'success': False, 'errors': str(error)}))
        raise SystemExit(1) from error


if __name__ == '__main__':
    main()
