"""Prepare ordered reference sheets for generated in-between pet poses."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from prepare_pet_webp import (
    GRID_COLUMNS,
    GRID_ROWS,
    KEY_POSE_COUNT,
    WORKING_POSE_ORDER,
    load_key_poses,
    prepare_interleaved_motion,
    validate_motion_pacing,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRECTORY = ROOT / "docs/pet-assets/sources-v2"
OUTPUT_DIRECTORY = ROOT / "docs/pet-assets/sources-v3"
GUIDE_DIRECTORY = ROOT / "output/pet-assets/interpolation-guides"
GENERATED_DIRECTORY = ROOT / "output/pet-assets/interpolation-generated"
# 每个生成批次包含 8 个姿势，24 个姿势共 3 个批次。
CHUNK_POSE_COUNT = 8
CHUNK_COUNT = KEY_POSE_COUNT // CHUNK_POSE_COUNT
# 每个动作的交错素材：动作前缀、关键姿势表、两个相位 sheet 的文件名。
MOTION_INTERPOLATION = (
    (
        "working",
        OUTPUT_DIRECTORY / "working-base-ordered.png",
        ("working-inbetween-one-third.png", "working-inbetween-two-thirds.png"),
    ),
    (
        "walking-right",
        SOURCE_DIRECTORY / "walking-right.png",
        (
            "walking-right-inbetween-one-third.png",
            "walking-right-inbetween-two-thirds.png",
        ),
    ),
)
PHASE_NAMES = ("one-third", "two-thirds")


def split_contact_sheet(path: Path) -> list[Image.Image]:
    """Split one 6-by-4 contact sheet into ordered RGBA cells."""
    try:
        with Image.open(path) as source:
            rgba = source.convert("RGBA")
    except OSError as error:
        raise RuntimeError(f"Unable to read source sheet: {path}") from error

    cell_width = rgba.width / GRID_COLUMNS
    cell_height = rgba.height / GRID_ROWS
    target_size = (round(cell_width), round(cell_height))
    return [
        rgba.crop(
            (
                round(column * cell_width),
                round(row * cell_height),
                round((column + 1) * cell_width),
                round((row + 1) * cell_height),
            )
        ).resize(target_size, Image.Resampling.LANCZOS)
        for row in range(GRID_ROWS)
        for column in range(GRID_COLUMNS)
    ]


def compose_contact_sheet(frames: list[Image.Image], path: Path) -> None:
    """Compose exactly 24 frames into a 6-by-4 reference sheet."""
    expected_count = GRID_COLUMNS * GRID_ROWS
    if len(frames) != expected_count:
        raise ValueError(f"Expected {expected_count} frames, received {len(frames)}")

    cell_width, cell_height = frames[0].size
    if any(frame.size != (cell_width, cell_height) for frame in frames):
        raise ValueError("Reference cells must share identical dimensions")

    sheet = Image.new(
        "RGBA",
        (cell_width * GRID_COLUMNS, cell_height * GRID_ROWS),
        (255, 0, 255, 255),
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            (
                index % GRID_COLUMNS * cell_width,
                index // GRID_COLUMNS * cell_height,
            ),
        )

    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        sheet.convert("RGB").save(path, "PNG", optimize=True)
    except OSError as error:
        raise RuntimeError(f"Unable to write reference sheet: {path}") from error


def compose_pair_guides(
    frames: list[Image.Image], motion_name: str
) -> list[Path]:
    """Create three compact guides pairing each key pose with its successor."""
    if len(frames) != GRID_COLUMNS * GRID_ROWS:
        raise ValueError("Pair guides require exactly 24 ordered key poses")

    cell_width, cell_height = frames[0].size
    guide_paths = []
    GUIDE_DIRECTORY.mkdir(parents=True, exist_ok=True)
    for chunk_index in range(3):
        start_index = chunk_index * 8
        guide = Image.new(
            "RGBA",
            (cell_width * 4, cell_height * 4),
            (255, 0, 255, 255),
        )
        for local_index in range(8):
            frame_index = start_index + local_index
            column = local_index % 4
            row_group = local_index // 4 * 2
            guide.alpha_composite(
                frames[frame_index],
                (column * cell_width, row_group * cell_height),
            )
            guide.alpha_composite(
                frames[(frame_index + 1) % len(frames)],
                (column * cell_width, (row_group + 1) * cell_height),
            )
        guide_path = GUIDE_DIRECTORY / f"{motion_name}-pairs-{chunk_index}.png"
        try:
            guide.convert("RGB").save(guide_path, "PNG", optimize=True)
        except OSError as error:
            raise RuntimeError(f"Unable to write pair guide: {guide_path}") from error
        guide_paths.append(guide_path)
    return guide_paths


def split_generated_chunk(path: Path) -> list[Image.Image]:
    """Extract eight transparent poses from one generated 4-by-2 chunk."""
    try:
        with Image.open(path) as source:
            rgba = source.convert("RGBA")
    except OSError as error:
        raise RuntimeError(f"Unable to read generated chunk: {path}") from error

    cell_width = rgba.width / 4
    cell_height = rgba.height / 2
    return [
        rgba.crop(
            (
                round(column * cell_width),
                round(row * cell_height),
                round((column + 1) * cell_width),
                round((row + 1) * cell_height),
            )
        )
        for row in range(2)
        for column in range(4)
    ]


def normalize_generated_cell(frame: Image.Image, cell_size: int = 320) -> Image.Image:
    """Fit one generated transparent pose into a stable square source cell."""
    bounds = frame.getchannel("A").point(
        lambda alpha: 255 if alpha > 16 else 0
    ).getbbox()
    if bounds is None:
        raise ValueError("Generated intermediate pose is empty")
    crop = frame.crop(bounds)
    available = cell_size - 16
    scale = min(available / crop.width, available / crop.height)
    crop = crop.resize(
        (round(crop.width * scale), round(crop.height * scale)),
        Image.Resampling.LANCZOS,
    )
    cell = Image.new("RGBA", (cell_size, cell_size))
    cell.alpha_composite(
        crop,
        ((cell_size - crop.width) // 2, cell_size - 8 - crop.height),
    )
    return cell


def compose_generated_phase(
    chunk_paths: list[Path], output_path: Path
) -> Path:
    """Assemble three generated chunks into one transparent 6-by-4 sheet."""
    frames = [
        normalize_generated_cell(frame)
        for chunk_path in chunk_paths
        for frame in split_generated_chunk(chunk_path)
    ]
    if len(frames) != GRID_COLUMNS * GRID_ROWS:
        raise ValueError("Generated phase must contain exactly 24 poses")

    cell_size = frames[0].width
    sheet = Image.new(
        "RGBA",
        (GRID_COLUMNS * cell_size, GRID_ROWS * cell_size),
    )
    for index, frame in enumerate(frames):
        sheet.alpha_composite(
            frame,
            (
                index % GRID_COLUMNS * cell_size,
                index // GRID_COLUMNS * cell_size,
            ),
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        sheet.save(output_path, "PNG", optimize=True)
    except OSError as error:
        raise RuntimeError(f"Unable to write generated phase: {output_path}") from error
    return output_path


def build() -> list[Path]:
    """Write the ordered working sheet and compact interpolation guides."""
    source_path = SOURCE_DIRECTORY / "working-sweeping.png"
    frames = split_contact_sheet(source_path)
    ordered_frames = [frames[index] for index in WORKING_POSE_ORDER]
    output_path = OUTPUT_DIRECTORY / "working-base-ordered.png"
    compose_contact_sheet(ordered_frames, output_path)
    working_guides = compose_pair_guides(ordered_frames, "working")
    walking_frames = split_contact_sheet(SOURCE_DIRECTORY / "walking-right.png")
    walking_guides = compose_pair_guides(walking_frames, "walking-right")
    output_paths = [output_path, *working_guides, *walking_guides]
    for motion, key_sheet, filenames in MOTION_INTERPOLATION:
        phase_sheets = compose_phase_sheets(motion, filenames)
        if phase_sheets is None:
            continue
        output_paths.extend(phase_sheets)
        report = validate_composed_motion(key_sheet, phase_sheets)
        print(
            f"{motion}: transition phase medians {report['phase_medians']} "
            f"targets {report['targets']}"
        )
    return output_paths


def compose_phase_sheets(motion: str, filenames: tuple[str, str]) -> list[Path] | None:
    """Compose both phase sheets of one motion from its generated chunks."""
    composed = []
    for phase_name, filename in zip(PHASE_NAMES, filenames):
        chunk_paths = [
            GENERATED_DIRECTORY / f"{motion}-{phase_name}-chunk-{index}.png"
            for index in range(CHUNK_COUNT)
        ]
        if not all(path.exists() for path in chunk_paths):
            return None
        composed.append(
            compose_generated_phase(chunk_paths, OUTPUT_DIRECTORY / filename)
        )
    return composed


def validate_composed_motion(key_sheet: Path, phase_sheets: list[Path]) -> dict:
    """Reject composed in-between sheets that never reach their target phase."""
    frames = prepare_interleaved_motion(
        (key_sheet, *phase_sheets),
        load_key_poses()[0],
        cleanup_small_components=True,
    )
    return validate_motion_pacing(key_sheet.stem, frames)


def main() -> None:
    """Run reference preparation and print the generated paths."""
    try:
        paths = build()
    except ValueError as error:
        raise SystemExit(f"Generated in-between poses were rejected: {error}") from error
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()
