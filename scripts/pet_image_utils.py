"""Shared chroma-key preparation for generated pet artwork."""
import numpy as np
from PIL import Image


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
