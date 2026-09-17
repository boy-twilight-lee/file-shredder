"""Build crisp 24-frame walking WebPs from current Lulu artwork."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy import ndimage


CANVAS_SIZE = 400
GRID_COLUMNS = 6
GRID_ROWS = 4
FRAME_COUNT = GRID_COLUMNS * GRID_ROWS
LOOP_DURATION_MS = 1_000
TARGET_CHARACTER_HEIGHT = 356
TARGET_HEAD_CENTER_X = 200
TARGET_BASELINE_Y = 369
ALPHA_VISIBLE_THRESHOLD = 6


def chroma_to_rgba(cell: np.ndarray) -> Image.Image:
    """Remove a magenta key while preserving the original Lulu colors."""

    rgb = cell.astype(np.float32) / 255.0
    corner_size = max(3, min(cell.shape[:2]) // 20)
    corners = np.concatenate(
        (
            rgb[:corner_size, :corner_size].reshape(-1, 3),
            rgb[:corner_size, -corner_size:].reshape(-1, 3),
            rgb[-corner_size:, :corner_size].reshape(-1, 3),
            rgb[-corner_size:, -corner_size:].reshape(-1, 3),
        ),
        axis=0,
    )
    key = np.median(corners, axis=0)

    color_distance = np.linalg.norm(rgb - key[None, None, :], axis=2)
    alpha = np.clip((color_distance - 0.045) / 0.16, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    alpha[alpha < 0.01] = 0
    alpha[alpha > 0.99] = 1

    opaque = alpha >= 0.1
    component_input = opaque.astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(component_input, 8)
    keep = np.zeros_like(component_input)
    for index in range(1, count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        if area >= 10:
            keep[labels == index] = 1
    keep = cv2.dilate(keep, np.ones((3, 3), dtype=np.uint8), iterations=1)
    alpha[keep == 0] = 0

    solid = (alpha >= 0.72).astype(np.uint8)
    interior = cv2.erode(
        solid,
        np.ones((5, 5), dtype=np.uint8),
        iterations=1,
    ).astype(bool)
    if not np.any(interior):
        raise RuntimeError("A chroma-key cell has no opaque Lulu core.")
    _, nearest_indices = ndimage.distance_transform_edt(
        ~interior,
        return_indices=True,
    )
    nearest_core_rgb = rgb[nearest_indices[0], nearest_indices[1]]
    foreground = rgb.copy()
    boundary = (alpha > 0) & ~interior
    foreground[boundary] = nearest_core_rgb[boundary]
    rgba = np.dstack((foreground, alpha))
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(np.round(rgba * 255).astype(np.uint8), mode="RGBA")


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    """Return non-transparent bounds as left, top, right, bottom."""

    alpha = np.asarray(image)[:, :, 3]
    points = cv2.findNonZero((alpha >= ALPHA_VISIBLE_THRESHOLD).astype(np.uint8))
    if points is None:
        raise RuntimeError("A pose cell contains no visible Lulu pixels.")
    x, y, width, height = cv2.boundingRect(points)
    return x, y, x + width, y + height


def split_pose_sheet(sheet: Image.Image) -> list[Image.Image]:
    """Split a 6x4 pose sheet in row-major animation order."""

    rgb = np.asarray(sheet.convert("RGB"))
    x_edges = np.round(np.linspace(0, sheet.width, GRID_COLUMNS + 1)).astype(int)
    y_edges = np.round(np.linspace(0, sheet.height, GRID_ROWS + 1)).astype(int)
    frames: list[Image.Image] = []
    for row in range(GRID_ROWS):
        for column in range(GRID_COLUMNS):
            cell = rgb[
                y_edges[row] : y_edges[row + 1],
                x_edges[column] : x_edges[column + 1],
            ]
            frames.append(chroma_to_rgba(cell))
    if len(frames) != FRAME_COUNT:
        raise RuntimeError(f"Expected {FRAME_COUNT} pose cells, got {len(frames)}.")
    return frames


def clean_existing_frame(frame: Image.Image) -> Image.Image:
    """Clear hidden RGB, tighten alpha edges, and sharpen without edge halos."""

    rgba = np.asarray(frame.convert("RGBA"), dtype=np.float32) / 255.0
    alpha = rgba[:, :, 3]
    alpha_power = 1.35
    foreground_weight = np.power(alpha, alpha_power)
    background_weight = np.power(1 - alpha, alpha_power)
    denominator = foreground_weight + background_weight
    tightened_alpha = np.divide(
        foreground_weight,
        denominator,
        out=np.zeros_like(alpha),
        where=denominator > 1e-6,
    )
    tightened_alpha[tightened_alpha < 0.008] = 0
    tightened_alpha[tightened_alpha > 0.992] = 1

    rgb = rgba[:, :, :3]
    alpha_weight = cv2.GaussianBlur(tightened_alpha, (0, 0), 0.65)
    blurred_premultiplied = cv2.GaussianBlur(
        rgb * tightened_alpha[:, :, None],
        (0, 0),
        0.65,
    )
    blurred_rgb = np.zeros_like(rgb)
    stable = alpha_weight >= 1e-4
    blurred_rgb[stable] = blurred_premultiplied[stable] / alpha_weight[stable, None]
    sharpened = np.clip(rgb + 0.35 * (rgb - blurred_rgb), 0, 1)
    sharpened[tightened_alpha == 0] = 0
    return Image.fromarray(
        np.round(np.dstack((sharpened, tightened_alpha)) * 255).astype(np.uint8),
        mode="RGBA",
    )


def load_source_frames(source: Path) -> tuple[list[Image.Image], str]:
    """Load either a 24-frame current WebP or a 6x4 chroma pose sheet."""

    image = Image.open(source)
    frame_count = getattr(image, "n_frames", 1)
    if frame_count == FRAME_COUNT:
        frames: list[Image.Image] = []
        for index in range(frame_count):
            image.seek(index)
            frames.append(clean_existing_frame(image.convert("RGBA")))
        return frames, "current Lulu 24-frame WebP"
    if frame_count == 1:
        return split_pose_sheet(image), "current Lulu 6x4 pose sheet"
    raise RuntimeError(
        f"Source must contain 1 pose sheet or {FRAME_COUNT} animation frames; "
        f"got {frame_count}."
    )


def resize_rgba_premultiplied(image: Image.Image, scale: float) -> Image.Image:
    """Resize RGBA in premultiplied space to avoid dark or magenta edge bleed."""

    source = np.asarray(image, dtype=np.float32) / 255.0
    alpha = source[:, :, 3]
    premultiplied = source[:, :, :3] * alpha[:, :, None]
    width = max(1, round(image.width * scale))
    height = max(1, round(image.height * scale))
    size = (width, height)
    resized_alpha = cv2.resize(alpha, size, interpolation=cv2.INTER_LANCZOS4)
    resized_premultiplied = cv2.resize(
        premultiplied,
        size,
        interpolation=cv2.INTER_LANCZOS4,
    )
    resized_alpha = np.clip(resized_alpha, 0, 1)
    resized_rgb = np.zeros_like(resized_premultiplied)
    visible = resized_alpha >= 1e-4
    resized_rgb[visible] = np.clip(
        resized_premultiplied[visible] / resized_alpha[visible, None],
        0,
        1,
    )

    alpha_weight = cv2.GaussianBlur(resized_alpha, (0, 0), 0.8)
    blurred_premultiplied = cv2.GaussianBlur(
        resized_rgb * resized_alpha[:, :, None],
        (0, 0),
        0.8,
    )
    blurred_rgb = np.zeros_like(resized_rgb)
    stable = alpha_weight >= 1e-4
    blurred_rgb[stable] = blurred_premultiplied[stable] / alpha_weight[stable, None]
    sharpened = np.clip(resized_rgb + 0.78 * (resized_rgb - blurred_rgb), 0, 1)
    sharpened[~visible] = 0

    rgba = np.dstack((sharpened, resized_alpha))
    return Image.fromarray(np.round(rgba * 255).astype(np.uint8), mode="RGBA")


def normalize_frames(frames: Sequence[Image.Image]) -> list[Image.Image]:
    """Apply one scale and stable head/baseline anchors to every pose."""

    bounds = [alpha_bounds(frame) for frame in frames]
    heights = [bottom - top for _, top, _, bottom in bounds]
    shared_scale = TARGET_CHARACTER_HEIGHT / float(np.median(heights))

    normalized: list[Image.Image] = []
    for frame, bounds_before_resize in zip(frames, bounds):
        resized = resize_rgba_premultiplied(frame, shared_scale)
        left, top, right, bottom = (
            round(value * shared_scale) for value in bounds_before_resize
        )
        alpha = np.asarray(resized)[:, :, 3]
        head_bottom = top + max(1, int((bottom - top) * 0.56))
        head_alpha = alpha[top:head_bottom, left:right].astype(np.float64)
        x_coordinates = np.arange(left, right, dtype=np.float64)[None, :]
        alpha_sum = float(head_alpha.sum())
        head_center_x = (
            float((head_alpha * x_coordinates).sum() / alpha_sum)
            if alpha_sum > 0
            else (left + right) / 2
        )
        paste_x = round(TARGET_HEAD_CENTER_X - head_center_x)
        paste_y = TARGET_BASELINE_Y - bottom
        canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        canvas.alpha_composite(resized, dest=(paste_x, paste_y))
        normalized.append(canvas)
    return normalized


def frame_durations() -> list[int]:
    """Distribute exactly 1000ms over 24 integer-duration frames."""

    boundaries = [round(index * LOOP_DURATION_MS / FRAME_COUNT) for index in range(FRAME_COUNT + 1)]
    return [boundaries[index + 1] - boundaries[index] for index in range(FRAME_COUNT)]


def save_webp(frames: Sequence[Image.Image], output: Path) -> None:
    """Write independent lossless keyframes to prevent edge-block carryover."""

    if len(frames) != FRAME_COUNT:
        raise ValueError(f"Expected {FRAME_COUNT} frames, got {len(frames)}.")
    output.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output,
        format="WEBP",
        save_all=True,
        append_images=list(frames[1:]),
        duration=frame_durations(),
        loop=0,
        lossless=True,
        quality=100,
        method=6,
        minimize_size=False,
        kmin=1,
        kmax=1,
        allow_mixed=False,
        exact=True,
    )


def edge_metrics(frame: Image.Image) -> dict[str, float | int]:
    """Measure alpha transition size and edge-local color sharpness."""

    rgba = np.asarray(frame)
    alpha = rgba[:, :, 3]
    partial = (alpha > 0) & (alpha < 255)
    edge_band = cv2.morphologyEx(
        (alpha > 8).astype(np.uint8),
        cv2.MORPH_GRADIENT,
        np.ones((3, 3), dtype=np.uint8),
    ).astype(bool)
    gray = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2GRAY)
    laplacian = np.abs(cv2.Laplacian(gray, cv2.CV_64F))
    return {
        "partial_alpha_pixels": int(np.count_nonzero(partial)),
        "edge_band_pixels": int(np.count_nonzero(edge_band)),
        "edge_laplacian_mean": round(float(np.mean(laplacian[edge_band])), 6),
    }


def validate_frames(frames: Sequence[Image.Image]) -> dict[str, object]:
    """Validate frame count, bounds, size consistency, and transparent RGB."""

    if len(frames) != FRAME_COUNT:
        raise RuntimeError(f"Frame count mismatch: {len(frames)} != {FRAME_COUNT}")
    bounds = [alpha_bounds(frame) for frame in frames]
    heights = [bottom - top for _, top, _, bottom in bounds]
    widths = [right - left for left, _, right, _ in bounds]
    edge_contacts = [
        index
        for index, (left, top, right, bottom) in enumerate(bounds)
        if left <= 1 or top <= 1 or right >= CANVAS_SIZE - 1 or bottom >= CANVAS_SIZE - 1
    ]
    hidden_rgb = [
        int(
            np.count_nonzero(
                np.any(np.asarray(frame)[:, :, :3] != 0, axis=2)
                & (np.asarray(frame)[:, :, 3] == 0)
            )
        )
        for frame in frames
    ]
    if edge_contacts:
        raise RuntimeError(f"Frames touch the canvas edge: {edge_contacts}")
    if max(hidden_rgb) != 0:
        raise RuntimeError("Transparent pixels contain hidden RGB edge contamination.")
    return {
        "frame_count": len(frames),
        "canvas": [CANVAS_SIZE, CANVAS_SIZE],
        "character_height": {
            "median": float(np.median(heights)),
            "min": min(heights),
            "max": max(heights),
            "spread": max(heights) - min(heights),
        },
        "character_width": {
            "median": float(np.median(widths)),
            "min": min(widths),
            "max": max(widths),
        },
        "edge_contacts": edge_contacts,
        "hidden_rgb_pixels_max": max(hidden_rgb),
        "edge": {
            "partial_alpha_pixels_median": float(
                np.median([edge_metrics(frame)["partial_alpha_pixels"] for frame in frames])
            ),
            "edge_laplacian_mean_median": float(
                np.median([edge_metrics(frame)["edge_laplacian_mean"] for frame in frames])
            ),
        },
    }


def make_preview(frames: Sequence[Image.Image], output: Path) -> None:
    """Render all frames on a high-contrast checkerboard for visual QA."""

    cell_size = 200
    columns = 8
    rows = 3
    sheet = Image.new("RGB", (columns * cell_size, rows * cell_size), "white")
    for index, frame in enumerate(frames):
        checker = Image.new("RGB", (cell_size, cell_size), (232, 232, 232))
        draw = ImageDraw.Draw(checker)
        block = 20
        for y in range(0, cell_size, block):
            for x in range(0, cell_size, block):
                if (x // block + y // block) % 2:
                    draw.rectangle(
                        (x, y, x + block - 1, y + block - 1),
                        fill=(196, 196, 196),
                    )
        thumbnail = frame.resize((cell_size, cell_size), Image.Resampling.LANCZOS)
        checker.paste(thumbnail, mask=thumbnail.getchannel("A"))
        sheet.paste(checker, ((index % columns) * cell_size, (index // columns) * cell_size))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def build_parser() -> argparse.ArgumentParser:
    """Create command-line arguments."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source",
        type=Path,
        help="Current Lulu 24-frame WebP or 6x4 chroma pose sheet.",
    )
    parser.add_argument("--right-output", type=Path, required=True)
    parser.add_argument("--left-output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    return parser


def main() -> None:
    """Build, validate, and report both directional animations."""

    args = build_parser().parse_args()
    source = args.source.resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Pose sheet not found: {source}")

    source_frames, source_kind = load_source_frames(source)
    right_frames = normalize_frames(source_frames)
    left_frames = [ImageOps.mirror(frame) for frame in right_frames]
    right_output = args.right_output.resolve()
    left_output = args.left_output.resolve()
    save_webp(right_frames, right_output)
    save_webp(left_frames, left_output)

    preview = args.preview.resolve()
    make_preview(right_frames, preview)
    report = {
        "ok": True,
        "source": str(source),
        "identity": source_kind,
        "contract": {
            "frame_count": FRAME_COUNT,
            "duration_ms": LOOP_DURATION_MS,
            "canvas": [CANVAS_SIZE, CANVAS_SIZE],
            "left_derivation": "frame-by-frame horizontal mirror with unchanged frame order",
            "encoding": "lossless independent WebP keyframes",
        },
        "right": {
            "output": str(right_output),
            "validation": validate_frames(right_frames),
        },
        "left": {
            "output": str(left_output),
            "validation": validate_frames(left_frames),
        },
        "preview": str(preview),
    }
    report_path = args.report.resolve()
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
