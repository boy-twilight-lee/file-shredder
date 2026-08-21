"""Convert generated checkerboard cutouts into tightly cropped transparent PNG assets."""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


SOURCE_FILES = (
    Path(r"C:\Users\李银超\.codex\generated_images\01a0224e-14a9-7642-8331-fac96a428315\exec-a04cb243-6975-429d-8283-90c0ec7ceefd.png"),
    Path(r"C:\Users\李银超\.codex\generated_images\01a0224e-14a9-7642-8331-fac96a428315\exec-d715fe9a-9e9f-4731-b483-52bcef88c1dc.png"),
    Path(r"C:\Users\李银超\.codex\generated_images\01a0224e-14a9-7642-8331-fac96a428315\exec-d79cf075-5fb5-4fce-97c2-b8ce4dccf656.png"),
)
OUTPUT_DIRECTORY = Path(__file__).resolve().parents[1] / "src" / "assets" / "pet-templates"


def remove_checkerboard(source_path: Path, output_path: Path) -> None:
    """Flood-fill the neutral light checkerboard and convert it into alpha."""
    rgb = np.asarray(Image.open(source_path).convert("RGB"), dtype=np.uint8)
    height, width, _ = rgb.shape
    channel_range = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    background_candidate = (rgb.min(axis=2) >= 225) & (channel_range <= 8)
    background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        queue.extend(((0, x), (height - 1, x)))
    for y in range(height):
        queue.extend(((y, 0), (y, width - 1)))

    while queue:
        y, x = queue.popleft()
        if background[y, x] or not background_candidate[y, x]:
            continue
        background[y, x] = True
        if y > 0:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x > 0:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    rgba = np.dstack((rgb, np.where(background, 0, 255).astype(np.uint8)))
    image = Image.fromarray(rgba, "RGBA")
    bounds = image.getbbox()
    if bounds is None:
        raise ValueError(f"No foreground found in {source_path}")
    left, top, right, bottom = bounds
    padding = 8
    crop_bounds = (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )
    image.crop(crop_bounds).save(output_path, optimize=True)


def main() -> None:
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for index, source_path in enumerate(SOURCE_FILES, start=1):
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        output_path = OUTPUT_DIRECTORY / f"portrait-template-{index}.png"
        remove_checkerboard(source_path, output_path)
        print(output_path)


if __name__ == "__main__":
    main()
