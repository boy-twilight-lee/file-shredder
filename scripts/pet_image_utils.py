"""Shared image preparation helpers for the default pet artwork."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from PIL import Image


def remove_chroma_key(image: Image.Image) -> Image.Image:
    """Remove a magenta key and its edge spill while preserving the subject."""
    source = np.asarray(image.convert("RGBA"), dtype=np.float32)
    rgb = source[:, :, :3]
    source_alpha = source[:, :, 3] / 255
    excess = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    chroma_alpha = 1 - np.clip((excess - 8) / 232, 0, 1)
    chroma_alpha[excess > 200] = 0
    alpha = source_alpha * chroma_alpha
    background = np.array([255, 0, 255], dtype=np.float32)
    clean = (rgb - (1 - chroma_alpha[:, :, None]) * background) / np.maximum(
        chroma_alpha[:, :, None], 0.01
    )
    rgba = np.dstack((np.clip(clean, 0, 255), alpha * 255)).astype(np.uint8)
    rgba[alpha < 0.02] = 0
    return Image.fromarray(rgba, "RGBA")


def _rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    """Convert a floating-point RGB array to HSV without optional dependencies."""
    maximum = rgb.max(axis=-1)
    minimum = rgb.min(axis=-1)
    delta = maximum - minimum
    saturation = np.divide(
        delta,
        maximum,
        out=np.zeros_like(delta),
        where=maximum > 0,
    )
    hue = np.zeros_like(maximum)
    non_gray = delta > 1e-6
    red = non_gray & (maximum == rgb[..., 0])
    green = non_gray & (maximum == rgb[..., 1])
    blue = non_gray & (maximum == rgb[..., 2])
    red_hue = np.divide(
        rgb[..., 1] - rgb[..., 2],
        delta,
        out=np.zeros_like(delta),
        where=non_gray,
    )
    green_hue = np.divide(
        rgb[..., 2] - rgb[..., 0],
        delta,
        out=np.zeros_like(delta),
        where=non_gray,
    )
    blue_hue = np.divide(
        rgb[..., 0] - rgb[..., 1],
        delta,
        out=np.zeros_like(delta),
        where=non_gray,
    )
    hue[red] = red_hue[red] % 6
    hue[green] = green_hue[green] + 2
    hue[blue] = blue_hue[blue] + 4
    hue /= 6
    return np.stack((hue, saturation, maximum), axis=-1)


def _hsv_to_rgb(hsv: np.ndarray) -> np.ndarray:
    """Convert a floating-point HSV array back to RGB."""
    hue = (hsv[..., 0] % 1) * 6
    saturation = np.clip(hsv[..., 1], 0, 1)
    value = np.clip(hsv[..., 2], 0, 1)
    sector = np.floor(hue).astype(np.int32)
    fraction = hue - sector
    primary = value * (1 - saturation)
    secondary = value * (1 - saturation * fraction)
    tertiary = value * (1 - saturation * (1 - fraction))
    channels = (
        (value, tertiary, primary),
        (secondary, value, primary),
        (primary, value, tertiary),
        (primary, secondary, value),
        (tertiary, primary, value),
        (value, primary, secondary),
    )
    rgb = np.zeros_like(hsv)
    for index, channel in enumerate(channels):
        mask = sector % 6 == index
        rgb[mask] = np.stack(channel, axis=-1)[mask]
    return rgb


def _warm_pixels(image: Image.Image) -> np.ndarray:
    """Return opaque yellow and orange pixels used to calibrate Lulu's palette."""
    pixels = np.asarray(image.convert("RGBA"), dtype=np.float32)
    hsv = _rgb_to_hsv(pixels[:, :, :3] / 255)
    alpha = pixels[:, :, 3] > 96
    warm = (
        alpha
        & (hsv[:, :, 0] >= 0.02)
        & (hsv[:, :, 0] <= 0.19)
        & (hsv[:, :, 1] >= 0.22)
        & (hsv[:, :, 2] >= 0.2)
    )
    return hsv[warm]


def match_warm_palette(
    images: Sequence[Image.Image], reference: Image.Image
) -> list[Image.Image]:
    """Match every generated frame to one shared yellow-orange reference palette."""
    if not images:
        return []
    source_samples = np.concatenate([_warm_pixels(image) for image in images])
    target_samples = _warm_pixels(reference)
    if len(source_samples) < 256 or len(target_samples) < 256:
        raise ValueError("Insufficient warm pixels for palette calibration")
    quantiles = np.linspace(0, 1, 33)
    source_curves = np.quantile(source_samples, quantiles, axis=0)
    target_curves = np.quantile(target_samples, quantiles, axis=0)
    calibrated: list[Image.Image] = []
    for image in images:
        pixels = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
        hsv = _rgb_to_hsv(pixels[:, :, :3].astype(np.float32) / 255)
        alpha = pixels[:, :, 3] > 96
        warm = (
            alpha
            & (hsv[:, :, 0] >= 0.02)
            & (hsv[:, :, 0] <= 0.19)
            & (hsv[:, :, 1] >= 0.22)
            & (hsv[:, :, 2] >= 0.2)
        )
        for channel in range(3):
            hsv[:, :, channel][warm] = np.interp(
                hsv[:, :, channel][warm],
                source_curves[:, channel],
                target_curves[:, channel],
            )
        pixels[:, :, :3] = np.round(_hsv_to_rgb(hsv) * 255).astype(np.uint8)
        pixels[pixels[:, :, 3] == 0, :3] = 0
        calibrated.append(Image.fromarray(pixels, "RGBA"))
    return calibrated


def warm_palette_signature(image: Image.Image) -> tuple[float, float, float]:
    """Return the median warm HSV signature used by build validation."""
    samples = _warm_pixels(image)
    if len(samples) == 0:
        raise ValueError("The image has no warm palette samples")
    return tuple(float(value) for value in np.median(samples, axis=0))
