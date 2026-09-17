"""Assemble four HD Lulu pose sheets into color-stable 400px WebPs."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import cv2
import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove

from prepare_pet_walk_webp import (
    FRAME_COUNT,
    make_preview,
    normalize_frames,
    save_webp,
    validate_frames,
)


GROUP_COLUMNS = 3
GROUP_ROWS = 2
GROUP_FRAME_COUNT = GROUP_COLUMNS * GROUP_ROWS
OPAQUE_ALPHA = 224
WARM_SATURATION_MIN = 70
WARM_VALUE_MIN = 80


@dataclass(frozen=True)
class WarmColorTarget:
    """Shared warm-color statistics used to suppress animation flicker."""

    hue_median: float
    saturation_median: float
    value_median: float


def split_group_sheet(path: Path) -> list[Image.Image]:
    """Split one 3x2 generated sheet into six original-resolution cells."""

    sheet = Image.open(path).convert("RGB")
    x_edges = np.round(np.linspace(0, sheet.width, GROUP_COLUMNS + 1)).astype(int)
    y_edges = np.round(np.linspace(0, sheet.height, GROUP_ROWS + 1)).astype(int)
    cells: list[Image.Image] = []
    for row in range(GROUP_ROWS):
        for column in range(GROUP_COLUMNS):
            cells.append(
                sheet.crop(
                    (
                        x_edges[column],
                        y_edges[row],
                        x_edges[column + 1],
                        y_edges[row + 1],
                    )
                )
            )
    return cells


def keep_subject_component(image: Image.Image) -> Image.Image:
    """Keep Lulu's main connected component and remove detached glow residue."""

    rgba = np.asarray(image.convert("RGBA")).copy()
    alpha = rgba[:, :, 3]
    strong = (alpha >= 40).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(strong, 8)
    if count <= 1:
        raise RuntimeError("Background extraction produced no visible Lulu component.")
    selected = max(
        range(1, count),
        key=lambda index: int(stats[index, cv2.CC_STAT_AREA]),
    )
    component = (labels == selected).astype(np.uint8)
    component = cv2.dilate(
        component,
        np.ones((5, 5), dtype=np.uint8),
        iterations=1,
    )
    alpha[component == 0] = 0

    # Tighten long, low-confidence alpha tails left by generated background glow.
    normalized = alpha.astype(np.float32) / 255.0
    foreground_weight = np.power(normalized, 1.45)
    background_weight = np.power(1 - normalized, 1.45)
    tightened = np.divide(
        foreground_weight,
        foreground_weight + background_weight,
        out=np.zeros_like(normalized),
        where=(foreground_weight + background_weight) > 1e-6,
    )
    tightened[tightened < 0.025] = 0
    tightened[tightened > 0.985] = 1
    rgba[:, :, 3] = np.round(tightened * 255).astype(np.uint8)
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def extract_frames(group_paths: Sequence[Path]) -> list[Image.Image]:
    """Remove each generated backdrop and preserve all HD subject pixels."""

    session = new_session("u2netp")
    frames: list[Image.Image] = []
    for group_path in group_paths:
        for cell in split_group_sheet(group_path):
            extracted = remove(
                cell,
                session=session,
                alpha_matting=True,
                alpha_matting_foreground_threshold=225,
                alpha_matting_background_threshold=18,
                alpha_matting_erode_size=4,
            )
            frames.append(keep_subject_component(extracted))
    if len(frames) != FRAME_COUNT:
        raise RuntimeError(f"Expected {FRAME_COUNT} HD frames, got {len(frames)}.")
    return frames


def warm_color_pixels(image: Image.Image) -> np.ndarray:
    """Return opaque warm Lulu pixels while excluding eyes and green leaf."""

    rgba = np.asarray(image.convert("RGBA"))
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV)
    mask = (
        (rgba[:, :, 3] >= OPAQUE_ALPHA)
        & (hsv[:, :, 0] <= 40)
        & (hsv[:, :, 1] >= WARM_SATURATION_MIN)
        & (hsv[:, :, 2] >= WARM_VALUE_MIN)
    )
    pixels = hsv[mask].astype(np.float32)
    if len(pixels) < 1_000:
        raise RuntimeError("A frame has too few warm Lulu pixels for color calibration.")
    return pixels


def calculate_target(identity_path: Path) -> WarmColorTarget:
    """Read the current idle Lulu as the authoritative warm-color target."""

    identity = Image.open(identity_path).convert("RGBA")
    pixels = warm_color_pixels(identity)
    return WarmColorTarget(
        hue_median=float(np.median(pixels[:, 0])),
        saturation_median=float(np.median(pixels[:, 1])),
        value_median=float(np.median(pixels[:, 2])),
    )


def calibrate_frame(image: Image.Image, target: WarmColorTarget) -> Image.Image:
    """Match every frame to the same identity-derived warm-color statistics."""

    rgba = np.asarray(image.convert("RGBA")).copy()
    hsv = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2HSV).astype(np.float32)
    mask = (
        (rgba[:, :, 3] >= 8)
        & (hsv[:, :, 0] <= 40)
        & (hsv[:, :, 1] >= 40)
        & (hsv[:, :, 2] >= 40)
    )
    sample = warm_color_pixels(image)
    hue_delta = target.hue_median - float(np.median(sample[:, 0]))
    saturation_scale = target.saturation_median / max(
        float(np.median(sample[:, 1])),
        1.0,
    )
    value_scale = target.value_median / max(
        float(np.median(sample[:, 2])),
        1.0,
    )

    hsv[:, :, 0][mask] = np.clip(hsv[:, :, 0][mask] + hue_delta, 0, 40)
    hsv[:, :, 1][mask] = np.clip(
        hsv[:, :, 1][mask] * saturation_scale,
        0,
        255,
    )
    hsv[:, :, 2][mask] = np.clip(hsv[:, :, 2][mask] * value_scale, 0, 255)
    calibrated_rgb = cv2.cvtColor(
        np.round(hsv).astype(np.uint8),
        cv2.COLOR_HSV2RGB,
    )
    rgba[:, :, :3] = calibrated_rgb
    rgba[rgba[:, :, 3] == 0, :3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def color_report(frames: Sequence[Image.Image]) -> dict[str, object]:
    """Report residual per-frame color spread after shared calibration."""

    medians = np.array(
        [
            np.median(warm_color_pixels(frame), axis=0)
            for frame in frames
        ],
        dtype=np.float32,
    )
    return {
        "per_frame_hsv_medians": medians.round(3).tolist(),
        "hue_spread": float(np.ptp(medians[:, 0])),
        "saturation_spread": float(np.ptp(medians[:, 1])),
        "value_spread": float(np.ptp(medians[:, 2])),
    }


def build_parser() -> argparse.ArgumentParser:
    """Create command-line arguments."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--group", action="append", type=Path, required=True)
    parser.add_argument("--identity", type=Path, required=True)
    parser.add_argument("--right-output", type=Path, required=True)
    parser.add_argument("--left-output", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    return parser


def main() -> None:
    """Extract, color-normalize, scale, encode, and validate the HD cycle."""

    args = build_parser().parse_args()
    if len(args.group) != 4:
        raise ValueError("Exactly four six-frame group sheets are required.")
    group_paths = [path.resolve() for path in args.group]
    for path in [*group_paths, args.identity.resolve()]:
        if not path.is_file():
            raise FileNotFoundError(f"Required image does not exist: {path}")

    extracted = extract_frames(group_paths)
    target = calculate_target(args.identity.resolve())
    calibrated = [calibrate_frame(frame, target) for frame in extracted]
    right_frames = normalize_frames(calibrated)
    left_frames = [ImageOps.mirror(frame) for frame in right_frames]

    right_output = args.right_output.resolve()
    left_output = args.left_output.resolve()
    save_webp(right_frames, right_output)
    save_webp(left_frames, left_output)
    preview_path = args.preview.resolve()
    make_preview(right_frames, preview_path)

    report = {
        "ok": True,
        "source_groups": [str(path) for path in group_paths],
        "identity_reference": str(args.identity.resolve()),
        "right": validate_frames(right_frames),
        "left": validate_frames(left_frames),
        "color": color_report(right_frames),
        "outputs": {
            "right": str(right_output),
            "left": str(left_output),
            "preview": str(preview_path),
        },
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
