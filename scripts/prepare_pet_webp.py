"""Build static and animated WebP assets for the default Lulu pet."""

from __future__ import annotations

import json
from collections import deque
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
INTERPOLATION_SOURCES = DOCUMENTS / "sources-v3"
OUTPUT = ROOT / "output/pet-assets"
SIZE = 640
GRID_COLUMNS = 6
GRID_ROWS = 4
TARGET_HEIGHT = 570
BASELINE = 591
VIDEO_TIMELINE_FPS = 24
KEY_POSE_COUNT = 24
# 左右步行与扫地动作只播放逐帧绘制的关键姿势：24 帧、24fps、1 秒循环。
MOTION_POSE_COUNT = KEY_POSE_COUNT
MOTION_DURATION = 1000
# 单个动作的角色高度中位数相对 idle 允许的最大偏差。
CHARACTER_HEIGHT_TOLERANCE = 40
# 同一动作内单帧角色高度允许的最大波动，用于拦截逐帧尺寸跳动。
CHARACTER_HEIGHT_SPREAD_TOLERANCE = 24
# 生成式过渡姿势在每个关键帧间隔中补入的采样数：关键帧、1/3 过渡、2/3 过渡。
INTERPOLATED_FRAMES_PER_KEY = 3
INTERPOLATED_POSE_COUNT = KEY_POSE_COUNT * INTERPOLATED_FRAMES_PER_KEY
# 过渡姿势在其关键帧间隔中允许的相位偏差，用于拦截“近似复制关键帧”的生成结果。
PHASE_TOLERANCE = 0.18
# 关键帧间隔的平均 alpha 差异低于该值时视为没有位移，跳过相位校验。
MINIMUM_KEY_GAP = 1.0
# 相邻帧位移相对中位数的上下限，用于拦截停顿和瞬移造成的视觉跳变。
MOTION_STEP_SPIKE_TOLERANCE = 2.5
MOTION_STEP_FREEZE_TOLERANCE = 0.15
# 纸屑允许的 RGB 通道差值上限，避免把贴地杂色误判为纸屑。
PAPER_SCRAP_CHANNEL_SPREAD = 40
ANIMATION_DURATIONS = {
    "idle": 5000,
    "working": MOTION_DURATION,
    "left": MOTION_DURATION,
    "right": MOTION_DURATION,
    "success": 5000,
    "failure": 5000,
}
WORKING_POSE_ORDER = (
    0,
    19,
    20,
    2,
    21,
    4,
    6,
    13,
    7,
    8,
    9,
    11,
    17,
    12,
    10,
    16,
    14,
    15,
    5,
    3,
    22,
    1,
    23,
    18,
)
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


def remove_small_components(image: Image.Image, minimum_area: int = 512) -> Image.Image:
    """Remove tiny colored artifacts while preserving light paper scraps."""
    pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    mask = pixels[:, :, 3] > 32
    visited = np.zeros(mask.shape, dtype=bool)
    height, width = mask.shape
    for start_y, start_x in zip(*np.where(mask)):
        if visited[start_y, start_x]:
            continue
        queue = deque([(int(start_y), int(start_x))])
        visited[start_y, start_x] = True
        component = []
        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for offset_y in (-1, 0, 1):
                for offset_x in (-1, 0, 1):
                    next_y = y + offset_y
                    next_x = x + offset_x
                    if (
                        0 <= next_y < height
                        and 0 <= next_x < width
                        and mask[next_y, next_x]
                        and not visited[next_y, next_x]
                    ):
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))
        if len(component) < minimum_area:
            component_y, component_x = zip(*component)
            component_rgb = pixels[component_y, component_x, :3]
            median_rgb = np.median(component_rgb, axis=0)
            if not is_paper_scrap(median_rgb):
                pixels[component_y, component_x] = 0
    return Image.fromarray(pixels, "RGBA")


def is_paper_scrap(median_rgb: np.ndarray) -> bool:
    """Keep only light near-neutral specks so dark ground artifacts are dropped."""
    minimum = float(np.min(median_rgb))
    spread = float(np.max(median_rgb)) - minimum
    return minimum >= 185 and spread <= PAPER_SCRAP_CHANNEL_SPREAD


def prepare_single(name: str) -> Image.Image:
    """Prepare one generated static pose from its source image."""
    with Image.open(SOURCES / f"{name}.png") as source:
        return normalize_pose(source)


def load_contact_sheet(
    path: Path, cleanup_small_components: bool = False
) -> list[Image.Image]:
    """Extract 24 cleaned poses from one 6-by-4 generated contact sheet."""
    with Image.open(path) as source:
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
                pose = remove_chroma_key(rgba.crop(box))
                if cleanup_small_components:
                    pose = remove_small_components(pose, minimum_area=64)
                poses.append(pose)
    if len(poses) != KEY_POSE_COUNT:
        raise ValueError(f"Unexpected pose count: {path}, {len(poses)}")
    return poses


def character_height(bounds: tuple[int, int, int, int]) -> int:
    """Return the rendered character height of one pose's visible bounds."""
    return bounds[3] - bounds[1]


def family_height_factors(
    geometries: list[list[tuple[tuple[int, int, int, int], float]]],
) -> list[float]:
    """Return per-family factors that draw every character at TARGET_HEIGHT."""
    return [
        TARGET_HEIGHT
        / float(np.median([character_height(bounds) for bounds, _ in family]))
        for family in geometries
    ]


def motion_scale(
    height_factors: list[float],
    geometries: list[list[tuple[tuple[int, int, int, int], float]]],
) -> float:
    """Return the scale shared by every pose of one normalized motion."""
    return min(
        safe_pose_scale(bounds, head_center_x) / factor
        for factor, family in zip(height_factors, geometries)
        for bounds, head_center_x in family
    )


def alpha_plane(image: Image.Image) -> np.ndarray:
    """Return one pose's alpha channel as a float plane for motion measurement."""
    return np.asarray(image.getchannel("A"), dtype=np.float32)


def phase_projection(
    start: np.ndarray, target: np.ndarray, frame: np.ndarray
) -> tuple[float, float]:
    """Return how far a pose travelled along a key gap and its off-axis residual."""
    direction = (target - start).ravel()
    magnitude = float(np.linalg.norm(direction))
    if magnitude == 0:
        return 0.0, 0.0
    offset = (frame - start).ravel()
    phase = float(offset @ direction) / (magnitude * magnitude)
    residual = float(np.linalg.norm(offset - phase * direction)) / magnitude
    return phase, residual


def motion_leg_shares(frames: list[Image.Image]) -> list[list[float]]:
    """Return the silhouette-change share of every leg inside each key gap."""
    masks = [np.asarray(frame.getchannel("A")) > 32 for frame in frames]
    shares = []
    for index in range(KEY_POSE_COUNT):
        start = index * INTERPOLATED_FRAMES_PER_KEY
        steps = []
        for offset in range(INTERPOLATED_FRAMES_PER_KEY):
            first = masks[(start + offset) % len(masks)]
            second = masks[(start + offset + 1) % len(masks)]
            union = np.logical_or(first, second).sum()
            steps.append(
                0.0 if union == 0 else float(np.logical_xor(first, second).sum() / union)
            )
        total = sum(steps)
        shares.append(
            [0.0] * INTERPOLATED_FRAMES_PER_KEY
            if total == 0
            else [round(value / total, 3) for value in steps]
        )
    return shares


def validate_motion_pacing(name: str, frames: list[Image.Image]) -> dict:
    """Reject generated in-between poses that never reach their target phase.

    Every key gap is sampled as key / 1-3 / 2-3. A generated in-between sheet
    whose poses stay next to the starting key still passes the geometry and
    alignment checks, yet it makes the loop freeze for two frames and then snap,
    so the measured phase of each drawn pose along its key gap is verified here.
    """
    if len(frames) != INTERPOLATED_POSE_COUNT:
        raise ValueError(f"Unexpected motion frame count: {name}, {len(frames)}")
    planes = [alpha_plane(frame) for frame in frames]
    targets = [
        index / INTERPOLATED_FRAMES_PER_KEY
        for index in range(1, INTERPOLATED_FRAMES_PER_KEY)
    ]
    groups = []
    for index in range(KEY_POSE_COUNT):
        start = index * INTERPOLATED_FRAMES_PER_KEY
        target = planes[(start + INTERPOLATED_FRAMES_PER_KEY) % len(planes)]
        phases = []
        residuals = []
        for offset in range(1, INTERPOLATED_FRAMES_PER_KEY):
            phase, residual = phase_projection(
                planes[start], target, planes[start + offset]
            )
            phases.append(round(phase, 3))
            residuals.append(round(residual, 3))
        gap = float(np.abs(target - planes[start]).mean())
        if gap < MINIMUM_KEY_GAP:
            groups.append(
                {
                    "key": index,
                    "phases": phases,
                    "residuals": residuals,
                    "gap": round(gap, 3),
                }
            )
            continue
        for position, target_phase in enumerate(targets):
            if abs(phases[position] - target_phase) > PHASE_TOLERANCE:
                raise ValueError(
                    f"In-between pose is not at its target phase: {name}, "
                    f"key {index}, position {position + 1}, phase {phases[position]}, "
                    f"target {round(target_phase, 3)}"
                )
        if any(
            phases[position] >= phases[position + 1]
            for position in range(len(phases) - 1)
        ):
            raise ValueError(
                f"In-between poses are not ordered inside their key gap: "
                f"{name}, key {index}, phases {phases}"
            )
        groups.append(
            {
                "key": index,
                "phases": phases,
                "residuals": residuals,
                "gap": round(gap, 3),
            }
        )
    measured = [
        group
        for group in groups
        if all(
            abs(group["phases"][position] - targets[position]) <= PHASE_TOLERANCE
            for position in range(len(targets))
        )
    ]
    leg_shares = motion_leg_shares(frames)
    return {
        "frames_per_key_pose": INTERPOLATED_FRAMES_PER_KEY,
        "targets": [round(value, 3) for value in targets],
        "phase_medians": [
            round(float(np.median([group["phases"][position] for group in groups])), 3)
            for position in range(len(targets))
        ],
        "maximum_phase_error": round(
            max(
                abs(group["phases"][position] - targets[position])
                for group in measured
                for position in range(len(targets))
            ),
            3,
        ),
        "maximum_leg_share": round(max(max(share) for share in leg_shares), 3),
        "leg_shares": leg_shares,
        "groups": groups,
    }


def prepare_interleaved_motion(
    source_paths: tuple[Path, Path, Path],
    reference: Image.Image,
    cleanup_small_components: bool = False,
) -> list[Image.Image]:
    """Interleave three independently color-matched pose phases into 72 frames.

    Every phase comes from its own generated sheet, so their pixel scales are not
    comparable on their own. Each family is first factored to the shared
    TARGET_HEIGHT character height; otherwise the key poses and the generated
    in-between poses render at different sizes and the loop pops every three
    frames.
    """
    pose_families = [
        load_contact_sheet(
            path,
            cleanup_small_components=cleanup_small_components,
        )
        for path in source_paths
    ]
    geometries = [
        [measure_pose(pose) for pose in pose_family]
        for pose_family in pose_families
    ]
    height_factors = family_height_factors(geometries)
    shared_scale = motion_scale(height_factors, geometries)
    normalized_families = [
        match_warm_palette(
            [
                compose_pose(
                    pose,
                    bounds,
                    head_center_x,
                    shared_scale * factor,
                )
                for pose, (bounds, head_center_x) in zip(
                    pose_family,
                    family_geometries,
                )
            ],
            reference,
        )
        for pose_family, family_geometries, factor in zip(
            pose_families,
            geometries,
            height_factors,
        )
    ]
    return [
        normalized_families[phase][index]
        for index in range(KEY_POSE_COUNT)
        for phase in range(len(normalized_families))
    ]


def prepare_motion(
    source_path: Path,
    reference: Image.Image,
    cleanup_small_components: bool = False,
    pose_order: tuple[int, ...] | None = None,
) -> list[Image.Image]:
    """Build one motion from its authored key sheet without fabricated frames.

    The generated in-between sheets are deliberately not used: their poses stay
    next to the starting key instead of reaching the 1/3 and 2/3 positions of
    their key gap, so interleaving them freezes the loop and then snaps to the
    next key. Replaying the authored poses at a true 24fps is the smooth option.
    """
    poses = load_contact_sheet(
        source_path,
        cleanup_small_components=cleanup_small_components,
    )
    if pose_order is not None:
        if sorted(pose_order) != list(range(len(poses))):
            raise ValueError(f"Pose order is incomplete: {source_path.name}")
        poses = [poses[index] for index in pose_order]
    geometries = [measure_pose(pose) for pose in poses]
    height_factor = family_height_factors([geometries])[0]
    shared_scale = motion_scale([height_factor], [geometries])
    return match_warm_palette(
        [
            compose_pose(pose, bounds, head_center_x, shared_scale * height_factor)
            for pose, (bounds, head_center_x) in zip(poses, geometries)
        ],
        reference,
    )


def silhouette_distance(first: Image.Image, second: Image.Image) -> float:
    """Return the symmetric silhouette difference normalised by the union."""
    first_mask = np.asarray(first.getchannel("A")) > 32
    second_mask = np.asarray(second.getchannel("A")) > 32
    union = np.logical_or(first_mask, second_mask).sum()
    if union == 0:
        return 0.0
    return float(np.logical_xor(first_mask, second_mask).sum() / union)


def validate_motion_cycle(name: str, frames: list[Image.Image]) -> dict:
    """Reject a motion whose consecutive frames stall or lurch.

    A loop only reads as smooth while every step moves the silhouette by a
    comparable amount. Repeating a drawing stalls the character and pushes all of
    the movement into the next step, which the eye sees as a snap, so the step
    distances are compared against their own median here.
    """
    if not frames:
        raise ValueError(f"Motion has no frames: {name}")
    steps = [
        round(silhouette_distance(frames[index], frames[(index + 1) % len(frames)]), 4)
        for index in range(len(frames))
    ]
    median = float(np.median(steps))
    if median <= 0:
        raise ValueError(f"Motion never changes: {name}")
    maximum = max(steps)
    minimum = min(steps)
    if maximum > median * MOTION_STEP_SPIKE_TOLERANCE:
        raise ValueError(
            f"Motion lurches between frames: {name}, {maximum}, median {round(median, 4)}"
        )
    if minimum < median * MOTION_STEP_FREEZE_TOLERANCE:
        raise ValueError(
            f"Motion stalls between frames: {name}, {minimum}, median {round(median, 4)}"
        )
    return {
        "median_step": round(median, 4),
        "minimum_step": minimum,
        "maximum_step": maximum,
        "minimum_step_ratio": round(minimum / median, 3),
        "maximum_step_ratio": round(maximum / median, 3),
        "steps": steps,
    }


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


def motion_pose_durations() -> list[int]:
    """Return an exact 24fps schedule for the authored poses."""
    return frame_tick_durations(MOTION_POSE_COUNT)


def motion_preview_durations() -> list[int]:
    """Preserve the one-second loop within GIF's 10ms timing precision."""
    return [40, 40, 50, 40, 40, 40] * (MOTION_POSE_COUNT // 6)


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
    reference_height = character_height(reference_bounds)
    deltas = []
    heights = []
    for frame in frames:
        bounds, head_x = measure_pose(frame)
        heights.append(character_height(bounds))
        deltas.append(
            (
                abs(head_x - reference_head_x),
                abs(bounds[3] - reference_bounds[3]),
            )
        )
    maximum_delta = np.max(np.asarray(deltas), axis=0)
    if maximum_delta[0] > 3 or maximum_delta[1] > 2:
        raise ValueError(f"Pet alignment drift is too large: {name}, {maximum_delta}")
    height_spread = int(np.max(heights) - np.min(heights))
    if height_spread > CHARACTER_HEIGHT_SPREAD_TOLERANCE:
        raise ValueError(f"Pet character size pops every frame: {name}, {height_spread}")
    median_height = float(np.median(heights))
    idle_height_delta = abs(median_height - reference_height)
    if idle_height_delta > CHARACTER_HEIGHT_TOLERANCE:
        raise ValueError(
            f"Pet character size drift is too large: {name}, {idle_height_delta}"
        )
    return {
        "maximum_head_x_delta": round(float(maximum_delta[0]), 2),
        "maximum_baseline_delta": int(maximum_delta[1]),
        "character_height": {
            "median": round(median_height, 2),
            "range": [int(np.min(heights)), int(np.max(heights))],
            "spread": height_spread,
            "idle_delta": round(idle_height_delta, 2),
        },
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
    rows = [static_samples]
    for motion_name in ("working", "right"):
        motion_frames = frames[motion_name]
        rows.extend(
            motion_frames[index : index + GRID_COLUMNS]
            for index in range(0, len(motion_frames), GRID_COLUMNS)
        )
    thumbnail_size = 120
    contact = Image.new(
        "RGB",
        (GRID_COLUMNS * thumbnail_size, len(rows) * thumbnail_size),
        "#303743",
    )
    for row, samples in enumerate(rows):
        for column, pose in enumerate(samples):
            thumbnail = pose.resize(
                (thumbnail_size, thumbnail_size), Image.Resampling.LANCZOS
            )
            contact.paste(
                thumbnail,
                (column * thumbnail_size, row * thumbnail_size),
                thumbnail,
            )
    contact.save(OUTPUT / "webp-poses-preview.jpg", quality=94)


def make_motion_previews(frames: dict[str, list[Image.Image]]) -> None:
    """Render dark-background GIF previews for visual motion inspection."""
    preview_directory = OUTPUT / "previews"
    preview_directory.mkdir(parents=True, exist_ok=True)
    preview_durations = {
        "idle": merged_tick_durations([69, 3, 48]),
        "working": motion_preview_durations(),
        "right": motion_preview_durations(),
        "left": motion_preview_durations(),
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
    working = prepare_motion(
        SOURCES / "working-sweeping.png",
        idle,
        cleanup_small_components=True,
        pose_order=WORKING_POSE_ORDER,
    )
    right = prepare_motion(
        SOURCES / "walking-right.png",
        idle,
        cleanup_small_components=True,
    )
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
        "working": motion_pose_durations(),
        "right": motion_pose_durations(),
        "left": motion_pose_durations(),
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
        if name in {"working", "right", "left"}:
            asset["cycle"] = validate_motion_cycle(name, pose_frames)
        if name in ANIMATION_DURATIONS:
            if name in {"working", "right", "left"}:
                asset["timeline_fps"] = VIDEO_TIMELINE_FPS
                asset["timeline_frames"] = round(
                    ANIMATION_DURATIONS[name] * VIDEO_TIMELINE_FPS / 1000
                )
                asset["pose_fps"] = round(
                    MOTION_POSE_COUNT * 1000 / ANIMATION_DURATIONS[name], 2
                )
                asset["pose_count"] = MOTION_POSE_COUNT
            else:
                asset["timeline_fps"] = 24
                asset["timeline_frames"] = round(
                    ANIMATION_DURATIONS[name] * 24 / 1000
                )
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
