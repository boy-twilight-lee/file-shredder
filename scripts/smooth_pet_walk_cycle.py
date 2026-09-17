"""Smooth HD walk-sheet batch boundaries with alpha-aware optical flow."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

import cv2
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

from prepare_pet_walk_webp import make_preview, save_webp


FRAME_COUNT = 24
BOUNDARIES = (0, 6, 12, 18)
ANCHOR_INDICES = (3, 9, 15, 21)


def read_frames(path: Path) -> list[Image.Image]:
    """Decode every animation frame as an independent RGBA image."""

    image = Image.open(path)
    frames: list[Image.Image] = []
    for index in range(getattr(image, "n_frames", 1)):
        image.seek(index)
        frames.append(image.convert("RGBA").copy())
    if len(frames) != FRAME_COUNT:
        raise RuntimeError(f"Expected {FRAME_COUNT} frames, got {len(frames)}.")
    return frames


def flow_input(rgba: np.ndarray) -> np.ndarray:
    """Create a grayscale optical-flow input that includes silhouette alpha."""

    alpha = rgba[:, :, 3].astype(np.float32) / 255.0
    rgb = rgba[:, :, :3].astype(np.float32)
    composite = rgb * alpha[:, :, None] + 127.0 * (1 - alpha[:, :, None])
    return cv2.cvtColor(
        np.round(composite).astype(np.uint8),
        cv2.COLOR_RGB2GRAY,
    )


def calculate_flow(first: np.ndarray, second: np.ndarray) -> np.ndarray:
    """Estimate dense motion using the detail-preserving DIS algorithm."""

    estimator = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    estimator.setUseSpatialPropagation(True)
    return estimator.calc(flow_input(first), flow_input(second), None)


def remap(image: np.ndarray, flow: np.ndarray, amount: float) -> np.ndarray:
    """Warp one premultiplied RGBA frame toward its neighbor."""

    height, width = image.shape[:2]
    x_coordinates, y_coordinates = np.meshgrid(
        np.arange(width, dtype=np.float32),
        np.arange(height, dtype=np.float32),
    )
    map_x = x_coordinates - flow[:, :, 0] * amount
    map_y = y_coordinates - flow[:, :, 1] * amount
    return cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )


def interpolate(first: Image.Image, second: Image.Image, amount: float) -> Image.Image:
    """Interpolate a crisp alpha-aware pose between two real keyframes."""

    first_rgba = np.asarray(first, dtype=np.float32) / 255.0
    second_rgba = np.asarray(second, dtype=np.float32) / 255.0
    first_alpha = first_rgba[:, :, 3:4]
    second_alpha = second_rgba[:, :, 3:4]
    first_premultiplied = np.dstack(
        (first_rgba[:, :, :3] * first_alpha, first_alpha)
    )
    second_premultiplied = np.dstack(
        (second_rgba[:, :, :3] * second_alpha, second_alpha)
    )

    forward = calculate_flow(
        np.round(first_rgba * 255).astype(np.uint8),
        np.round(second_rgba * 255).astype(np.uint8),
    )
    backward = calculate_flow(
        np.round(second_rgba * 255).astype(np.uint8),
        np.round(first_rgba * 255).astype(np.uint8),
    )
    warped_first = remap(first_premultiplied, forward, amount)
    warped_second = remap(second_premultiplied, backward, 1 - amount)

    def signed_distance(alpha_channel: np.ndarray) -> np.ndarray:
        inside = alpha_channel >= 0.5
        return ndimage.distance_transform_edt(~inside) - ndimage.distance_transform_edt(inside)

    first_distance = signed_distance(warped_first[:, :, 3])
    second_distance = signed_distance(warped_second[:, :, 3])
    distance = first_distance * (1 - amount) + second_distance * amount
    alpha = np.clip(0.5 - distance, 0, 1)

    first_warped_alpha = warped_first[:, :, 3:4]
    second_warped_alpha = warped_second[:, :, 3:4]
    first_rgb = np.zeros_like(warped_first[:, :, :3])
    second_rgb = np.zeros_like(warped_second[:, :, :3])
    first_visible = first_warped_alpha[:, :, 0] >= 1e-4
    second_visible = second_warped_alpha[:, :, 0] >= 1e-4
    first_rgb[first_visible] = (
        warped_first[:, :, :3][first_visible]
        / first_warped_alpha[first_visible]
    )
    second_rgb[second_visible] = (
        warped_second[:, :, :3][second_visible]
        / second_warped_alpha[second_visible]
    )
    rgb = np.clip(first_rgb * (1 - amount) + second_rgb * amount, 0, 1)

    alpha[alpha < 0.008] = 0
    alpha[alpha > 0.992] = 1
    rgb[alpha == 0] = 0

    # Restore micro-contrast lost only in the warped transition frames.
    blurred = cv2.GaussianBlur(rgb, (0, 0), 0.55)
    rgb = np.clip(rgb + 0.32 * (rgb - blurred), 0, 1)
    rgb[alpha == 0] = 0
    return Image.fromarray(
        np.round(np.dstack((rgb, alpha)) * 255).astype(np.uint8),
        mode="RGBA",
    )


def smooth_boundaries(frames: Sequence[Image.Image]) -> list[Image.Image]:
    """Build one even cyclic motion path between four real HD key poses."""

    output = [frame.copy() for frame in frames]
    for anchor_position, start_index in enumerate(ANCHOR_INDICES):
        end_index = ANCHOR_INDICES[(anchor_position + 1) % len(ANCHOR_INDICES)]
        distance = (end_index - start_index) % FRAME_COUNT
        for step in range(1, distance):
            target_index = (start_index + step) % FRAME_COUNT
            output[target_index] = interpolate(
                frames[start_index],
                frames[end_index],
                step / distance,
            )
    return output


def descriptor(frame: Image.Image) -> np.ndarray:
    """Create a small premultiplied descriptor for temporal metrics."""

    rgba = np.asarray(frame, dtype=np.float32) / 255.0
    alpha = rgba[:, :, 3:4]
    premultiplied = np.dstack((rgba[:, :, :3] * alpha, alpha))
    return cv2.resize(premultiplied, (100, 100), interpolation=cv2.INTER_AREA)


def continuity_metrics(frames: Sequence[Image.Image]) -> dict[str, object]:
    """Measure cyclic adjacent changes and spike/freeze ratios."""

    descriptors = [descriptor(frame) for frame in frames]
    differences = [
        float(
            np.mean(
                np.abs(
                    descriptors[index]
                    - descriptors[(index + 1) % len(descriptors)]
                )
            )
        )
        for index in range(len(descriptors))
    ]
    median = float(np.median(differences))
    return {
        "differences": differences,
        "median": median,
        "minimum_ratio": min(differences) / max(median, 1e-6),
        "maximum_ratio": max(differences) / max(median, 1e-6),
        "batch_boundary_ratios": {
            str(boundary): differences[(boundary - 1) % FRAME_COUNT]
            / max(median, 1e-6)
            for boundary in BOUNDARIES
        },
    }


def build_parser() -> argparse.ArgumentParser:
    """Create command-line arguments."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--right-output", type=Path, required=True)
    parser.add_argument("--left-output", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    return parser


def main() -> None:
    """Smooth the cycle, mirror left, encode, and report continuity gains."""

    args = build_parser().parse_args()
    source_frames = read_frames(args.input.resolve())
    smoothed = smooth_boundaries(source_frames)
    left = [ImageOps.mirror(frame) for frame in smoothed]
    save_webp(smoothed, args.right_output.resolve())
    save_webp(left, args.left_output.resolve())
    make_preview(smoothed, args.preview.resolve())

    report = {
        "ok": True,
        "before": continuity_metrics(source_frames),
        "after": continuity_metrics(smoothed),
        "method": "cyclic alpha-aware bidirectional DIS optical-flow interpolation",
        "anchor_frames": list(ANCHOR_INDICES),
        "replaced_frames": [
            index for index in range(FRAME_COUNT) if index not in ANCHOR_INDICES
        ],
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
