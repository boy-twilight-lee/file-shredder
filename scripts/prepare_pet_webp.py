"""Build static and animated WebP assets for the default Lulu pet."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from pet_image_utils import (
    match_warm_palette,
    remove_chroma_key,
    warm_palette_signature,
)

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "src/assets/pet-templates/motions"
DOCUMENTS = ROOT / "docs/pet-assets"
SOURCES = DOCUMENTS / "sources-v2"
OUTPUT = ROOT / "output/pet-assets"
SIZE = 640
GRID_COLUMNS = 6
GRID_ROWS = 4
TARGET_HEIGHT = 570
BASELINE = 591
ANIMATION_DURATIONS = {
    "idle": 5000,
    "working": 2000,
    "left": 2000,
    "right": 2000,
    "success": 5000,
    "failure": 5000,
}
STATIC_NAMES = {
    "actions",
    "waiting",
    "rest-left",
    "rest-right",
}


def load_key_poses() -> list[Image.Image]:
    """Extract the approved transparent poses from the original 7-column atlas."""
    with Image.open(DOCUMENTS / "key-atlas.webp") as atlas:
        return [
            atlas.crop(
                (
                    index % 7 * SIZE,
                    index // 7 * SIZE,
                    (index % 7 + 1) * SIZE,
                    (index // 7 + 1) * SIZE,
                )
            ).convert("RGBA")
            for index in range(40)
        ]


def measure_pose(pose: Image.Image) -> tuple[tuple[int, int, int, int], float]:
    """Measure one cleaned pose and return its visible bounds and head center."""
    alpha = np.asarray(pose.getchannel("A"))
    opaque_mask = np.where(alpha > 64, 255, 0).astype(np.uint8)
    bounds = Image.fromarray(opaque_mask).getbbox()
    if bounds is None:
        raise ValueError("The generated pose is empty")
    height = bounds[3] - bounds[1]
    head_bottom = bounds[1] + round(height * 0.45)
    _, head_x = np.where(alpha[bounds[1] : head_bottom] > 64)
    if head_x.size == 0:
        raise ValueError("The generated pose has no stable head anchor")
    head_center_x = (float(head_x.min()) + float(head_x.max())) / 2
    return bounds, head_center_x


def safe_pose_scale(bounds: tuple[int, int, int, int], head_center_x: float) -> float:
    """Return the largest scale that preserves baseline height and side padding."""
    height = bounds[3] - bounds[1]
    left_extent = head_center_x - bounds[0]
    right_extent = bounds[2] - head_center_x
    return min(
        TARGET_HEIGHT / height,
        (SIZE / 2 - 10) / left_extent,
        (SIZE / 2 - 10) / right_extent,
    )


def compose_pose(
    pose: Image.Image,
    bounds: tuple[int, int, int, int],
    head_center_x: float,
    scale: float,
) -> Image.Image:
    """Place one cleaned pose on the runtime canvas using approved shared geometry."""
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    crop = pose.crop(bounds)
    crop = crop.resize(
        (round(width * scale), round(height * scale)), Image.Resampling.LANCZOS
    )
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.alpha_composite(
        crop,
        (
            round(SIZE / 2 - (head_center_x - bounds[0]) * scale),
            BASELINE - crop.height,
        ),
    )
    return canvas


def normalize_pose(image: Image.Image) -> Image.Image:
    """Fit a generated pose to the idle scale, head center, and foot baseline."""
    pose = remove_chroma_key(image)
    bounds, head_center_x = measure_pose(pose)
    return compose_pose(
        pose,
        bounds,
        head_center_x,
        safe_pose_scale(bounds, head_center_x),
    )


def prepare_single(name: str) -> Image.Image:
    """Prepare one generated static pose from its source image."""
    with Image.open(SOURCES / f"{name}.png") as source:
        return normalize_pose(source)


def prepare_contact_sheet(name: str) -> list[Image.Image]:
    """Extract an ordered 6-by-4 generated contact sheet into normalized frames."""
    with Image.open(SOURCES / f"{name}.png") as source:
        rgba = source.convert("RGBA")
        cell_width = rgba.width / GRID_COLUMNS
        cell_height = rgba.height / GRID_ROWS
        poses = []
        for row in range(GRID_ROWS):
            for column in range(GRID_COLUMNS):
                box = (
                    round(column * cell_width),
                    round(row * cell_height),
                    round((column + 1) * cell_width),
                    round((row + 1) * cell_height),
                )
                poses.append(remove_chroma_key(rgba.crop(box)))
    geometries = [measure_pose(pose) for pose in poses]
    shared_scale = min(
        safe_pose_scale(bounds, head_center_x)
        for bounds, head_center_x in geometries
    )
    return [
        compose_pose(pose, bounds, head_center_x, shared_scale)
        for pose, (bounds, head_center_x) in zip(poses, geometries)
    ]


def save_static(name: str, image: Image.Image) -> None:
    """Write one lossless single-frame WebP pose."""
    image.save(
        DESTINATION / f"{name}.webp",
        "WEBP",
        lossless=True,
        method=4,
        exact=True,
    )


def expression_pose(
    base: Image.Image, expression: Image.Image, include_mouth: bool
) -> Image.Image:
    """Reuse approved facial artwork without changing the body silhouette."""
    grid_y, grid_x = np.mgrid[:SIZE, :SIZE]
    mask = np.zeros((SIZE, SIZE), dtype=np.float32)
    regions = [(250, 191, 55, 49), (388, 191, 55, 49)]
    if include_mouth:
        regions.append((352, 316, 106, 39))
    for center_x, center_y, radius_x, radius_y in regions:
        distance = ((grid_x - center_x) / radius_x) ** 2 + (
            (grid_y - center_y) / radius_y
        ) ** 2
        mask = np.maximum(mask, np.clip((1 - distance) * 6, 0, 1))
    return Image.composite(
        expression,
        base,
        Image.fromarray((mask * 255).astype(np.uint8)),
    )


def blink_pose(open_pose: Image.Image, closed_pose: Image.Image) -> Image.Image:
    """Reuse the approved closed-eye drawing while keeping the smile and body fixed."""
    grid_y, grid_x = np.mgrid[:SIZE, :SIZE]
    mask = np.zeros((SIZE, SIZE), dtype=np.float32)
    for center_x in (251, 387):
        distance = ((grid_x - center_x) / 48) ** 2 + (
            (grid_y - 192) / 34
        ) ** 2
        mask = np.maximum(mask, np.clip((1 - distance) * 5, 0, 1))
    return Image.composite(
        closed_pose,
        open_pose,
        Image.fromarray((mask * 255).astype(np.uint8)),
    )


def frame_tick_durations(count: int) -> list[int]:
    """Return exact millisecond durations for a 24fps timeline."""
    pattern = (42, 41, 42)
    return [pattern[index % len(pattern)] for index in range(count)]


def merged_tick_durations(frame_counts: list[int]) -> list[int]:
    """Merge 24fps ticks into durations for visually identical hold frames."""
    ticks = frame_tick_durations(sum(frame_counts))
    durations = []
    cursor = 0
    for count in frame_counts:
        durations.append(sum(ticks[cursor : cursor + count]))
        cursor += count
    return durations


def save_animation(
    name: str, frames: list[Image.Image], durations: list[int]
) -> None:
    """Write a transparent lossless WebP loop with validated frame timing."""
    if not frames or len(frames) != len(durations):
        raise ValueError(f"Invalid animation frame timing: {name}")
    if sum(durations) != ANIMATION_DURATIONS[name]:
        raise ValueError(f"Invalid animation timing: {name}")
    frames[0].save(
        DESTINATION / f"{name}.webp",
        "WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        lossless=True,
        method=4,
        exact=True,
    )


def validate_palette(
    name: str, frames: list[Image.Image], reference: Image.Image
) -> dict:
    """Reject a visible warm-palette drift from the idle character."""
    reference_signature = np.array(warm_palette_signature(reference))
    signatures = np.array([warm_palette_signature(frame) for frame in frames])
    maximum_delta = np.max(np.abs(signatures - reference_signature), axis=0)
    if (
        maximum_delta[0] > 0.012
        or maximum_delta[1] > 0.055
        or maximum_delta[2] > 0.035
    ):
        raise ValueError(f"Warm palette drift is too large: {name}, {maximum_delta}")
    return {
        "median_hsv": [round(value, 4) for value in np.median(signatures, axis=0)],
        "maximum_delta": [round(value, 4) for value in maximum_delta],
    }


def validate_alignment(
    name: str, frames: list[Image.Image], reference: Image.Image
) -> dict:
    """Reject state transitions that move Lulu away from the idle anchor."""
    reference_bounds, reference_head_x = measure_pose(reference)
    deltas = []
    for frame in frames:
        bounds, head_x = measure_pose(frame)
        deltas.append(
            (
                abs(head_x - reference_head_x),
                abs(bounds[3] - reference_bounds[3]),
            )
        )
    maximum_delta = np.max(np.asarray(deltas), axis=0)
    if maximum_delta[0] > 3 or maximum_delta[1] > 2:
        raise ValueError(f"Pet alignment drift is too large: {name}, {maximum_delta}")
    return {
        "maximum_head_x_delta": round(float(maximum_delta[0]), 2),
        "maximum_baseline_delta": int(maximum_delta[1]),
    }


def read_webp_durations(path: Path) -> list[int]:
    """Read frame durations directly from RIFF ANMF chunks."""
    data = path.read_bytes()
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError(f"Invalid WebP container: {path.name}")
    durations = []
    cursor = 12
    while cursor + 8 <= len(data):
        chunk_type = data[cursor : cursor + 4]
        chunk_size = int.from_bytes(data[cursor + 4 : cursor + 8], "little")
        payload = cursor + 8
        if chunk_type == b"ANMF":
            durations.append(
                int.from_bytes(data[payload + 12 : payload + 15], "little")
            )
        cursor = payload + chunk_size + (chunk_size & 1)
    return durations


def inspect_asset(
    path: Path,
    expected_frames: int,
    expected_durations: list[int] | None = None,
) -> dict:
    """Validate encoded geometry, timing, transparency, and safe bounds."""
    with Image.open(path) as image:
        if image.size != (SIZE, SIZE) or image.n_frames != expected_frames:
            raise ValueError(f"Unexpected encoded geometry: {path.name}")
        bounds = []
        for index in range(image.n_frames):
            image.seek(index)
            frame = image.convert("RGBA")
            box = frame.getchannel("A").point(
                lambda alpha: 255 if alpha > 64 else 0
            ).getbbox()
            if box is None or min(box[:2]) < 1 or max(box[2:]) > SIZE - 1:
                raise ValueError(f"Clipped or empty frame: {path.name}, {index}, {box}")
            if frame.getpixel((0, 0))[3] != 0:
                raise ValueError(f"Nontransparent background: {path.name}")
            bounds.append(list(box))
    report = {
        "frames": expected_frames,
        "size": [SIZE, SIZE],
        "bytes": path.stat().st_size,
        "first_bounds": bounds[0],
    }
    if expected_durations is not None:
        encoded_durations = read_webp_durations(path)
        if encoded_durations != expected_durations:
            raise ValueError(f"Unexpected encoded timing: {path.name}")
        report["duration_ms"] = sum(encoded_durations)
    return report


def make_contact_sheet(frames: dict[str, list[Image.Image]]) -> None:
    """Create a QA sheet showing every new motion frame and key static states."""
    static_samples = [
        frames["idle"][0],
        frames["actions"][0],
        frames["waiting"][0],
        frames["success"][0],
        frames["failure"][0],
    ]
    working_keyframes = frames["working"]
    walking_keyframes = frames["right"]
    contact = Image.new("RGB", (6 * 180, 9 * 180), "#303743")
    rows = [
        static_samples,
        working_keyframes[:6],
        working_keyframes[6:12],
        working_keyframes[12:18],
        working_keyframes[18:],
        walking_keyframes[:6],
        walking_keyframes[6:12],
        walking_keyframes[12:18],
        walking_keyframes[18:],
    ]
    for row, samples in enumerate(rows):
        for column, pose in enumerate(samples):
            thumbnail = pose.resize((180, 180), Image.Resampling.LANCZOS)
            contact.paste(thumbnail, (column * 180, row * 180), thumbnail)
    contact.save(OUTPUT / "webp-poses-preview.jpg", quality=94)


def make_motion_previews(frames: dict[str, list[Image.Image]]) -> None:
    """Render dark-background GIF previews for visual motion inspection."""
    preview_directory = OUTPUT / "previews"
    preview_directory.mkdir(parents=True, exist_ok=True)
    preview_durations = {
        "idle": merged_tick_durations([69, 3, 48]),
        "working": merged_tick_durations([2] * 24),
        "right": merged_tick_durations([2] * 24),
        "left": merged_tick_durations([2] * 24),
    }
    for name, durations in preview_durations.items():
        rendered = []
        for frame in frames[name]:
            background = Image.new("RGBA", (SIZE, SIZE), "#303743")
            background.alpha_composite(frame)
            rendered.append(
                background.convert("RGB").resize(
                    (320, 320), Image.Resampling.LANCZOS
                )
            )
        rendered[0].save(
            preview_directory / f"{name}.gif",
            save_all=True,
            append_images=rendered[1:],
            duration=durations,
            loop=0,
            optimize=False,
        )


def build() -> dict:
    """Rebuild all supported poses and return a structured validation report."""
    DESTINATION.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    poses = load_key_poses()
    idle = poses[0]
    blink = blink_pose(idle, poses[2])
    actions = match_warm_palette([prepare_single("actions-point")], idle)
    waiting = match_warm_palette([prepare_single("waiting-refined")], idle)
    working_keyframes = match_warm_palette(
        prepare_contact_sheet("working-sweeping"), idle
    )
    working = working_keyframes
    walking_keyframes = match_warm_palette(
        prepare_contact_sheet("walking-right"), idle
    )
    right = walking_keyframes
    left = [ImageOps.mirror(frame) for frame in right]
    smile = expression_pose(poses[13], poses[12], include_mouth=True)
    closed_eyes = expression_pose(poses[14], poses[15], include_mouth=False)
    sigh = expression_pose(poses[14], poses[15], include_mouth=True)
    frames = {
        "idle": [idle, blink, idle],
        "actions": actions,
        "waiting": waiting,
        "working": working,
        "right": right,
        "left": left,
        "rest-right": [right[0]],
        "rest-left": [left[0]],
        "success": [smile, poses[13], smile],
        "failure": [poses[14], closed_eyes, sigh, closed_eyes, poses[14]],
    }
    for name in STATIC_NAMES:
        save_static(name, frames[name][0])
    animation_schedules = {
        "idle": merged_tick_durations([69, 3, 48]),
        "working": merged_tick_durations([2] * 24),
        "right": merged_tick_durations([2] * 24),
        "left": merged_tick_durations([2] * 24),
        "success": merged_tick_durations([24, 30, 66]),
        "failure": merged_tick_durations([38, 3, 17, 4, 58]),
    }
    for name, durations in animation_schedules.items():
        save_animation(name, frames[name], durations)
    idle.save(DESTINATION.parent / "default-pet-preview.png", optimize=True)
    review_path = DESTINATION / "review.webp"
    if review_path.exists():
        review_path.unlink()
    report = {}
    for name, pose_frames in frames.items():
        asset = inspect_asset(
            DESTINATION / f"{name}.webp",
            len(pose_frames),
            animation_schedules.get(name),
        )
        asset["palette"] = validate_palette(name, pose_frames, idle)
        asset["alignment"] = validate_alignment(name, pose_frames, idle)
        if name in ANIMATION_DURATIONS:
            asset["timeline_fps"] = 24
            asset["timeline_frames"] = round(ANIMATION_DURATIONS[name] * 24 / 1000)
        report[name] = asset
    make_contact_sheet(frames)
    make_motion_previews(frames)
    (OUTPUT / "webp-validation.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return {
        "success": True,
        "assets": report,
        "total_bytes": sum(item["bytes"] for item in report.values()),
    }


def main() -> None:
    """Run the asset build with structured errors for local and CI use."""
    try:
        print(json.dumps(build(), ensure_ascii=False))
    except (OSError, ValueError) as error:
        print(json.dumps({"success": False, "errors": str(error)}, ensure_ascii=False))
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
