from __future__ import annotations

import math
import subprocess
import tempfile
from collections import Counter

import numpy as np
from PIL import Image
from scipy import ndimage

from .image_analysis import COLORS, classify_target, detect_targets, hsv_channels
from .reward_analysis import ocr_character_boxes, pair_flexible_colors

def extract_requirements(image: Image.Image) -> tuple[list[dict], dict]:
    width, height = image.size
    band_top = int(height * 0.68)
    band = image.crop((0, band_top, width, height)).convert("L")
    binary = band.point(lambda value: 0 if value > 205 else 255)
    character_boxes = ocr_character_boxes(binary)
    if width > height:
        centers = [0.304, 0.373, 0.435, 0.498, 0.563, 0.630, 0.698]
    else:
        centers = [0.199, 0.300, 0.400, 0.500, 0.600, 0.700, 0.800]
    centers_px = [center * width for center in centers]
    boundaries = [
        centers_px[0] - (centers_px[1] - centers_px[0]) / 2
    ]
    boundaries.extend(
        (centers_px[index] + centers_px[index + 1]) / 2
        for index in range(len(centers_px) - 1)
    )
    boundaries.append(
        centers_px[-1] + (centers_px[-1] - centers_px[-2]) / 2
    )

    labels: list[str] = []
    label_height_cutoff = binary.height * (0.36 if width > height else 0.23)
    minimum_character_height = 5
    for index in range(7):
        candidates = []
        for character, x1, y1, x2, y2 in character_boxes:
            if character not in "0123456789-lI|":
                continue
            normalized_character = "1" if character in {"l", "I", "|"} else character
            if normalized_character.isdigit() and x2 - x1 > 80:
                x2 = x1 + 40
            if not (
                boundaries[index] <= (x1 + x2) / 2 < boundaries[index + 1]
                and 50 <= y1 < label_height_cutoff
                and y2 <= 140
                and y2 - y1 > minimum_character_height
            ):
                continue
            candidates.append((x1, y1, x2, y2, normalized_character))
        characters = []
        for candidate in sorted(
            candidates,
            key=lambda item: (item[2] - item[0]) * (item[3] - item[1]),
            reverse=True,
        ):
            x1, y1, x2, y2, character = candidate
            duplicate = False
            for accepted in characters:
                other_x1, other_y1, other_x2, other_y2, other_character = accepted
                if character == "-" or other_character == "-":
                    continue
                overlap_x = max(0, min(x2, other_x2) - max(x1, other_x1))
                overlap_y = max(0, min(y2, other_y2) - max(y1, other_y1))
                if (
                    overlap_x / max(1, min(x2 - x1, other_x2 - other_x1)) > 0.2
                    and overlap_y / max(1, min(y2 - y1, other_y2 - other_y1)) > 0.2
                ):
                    duplicate = True
                    break
            if not duplicate:
                characters.append(candidate)
        value = "".join(character for x1, _, _, _, character in sorted(characters))
        if not value:
            value = "0"
        if "-" not in value and len(value) == 2:
            value = f"{value[0]}-{value[1]}"
        labels.append(value)

    minimums: list[int] = []
    maximums: list[int] = []
    for label in labels:
        match = re.fullmatch(r"(\d)(?:-(\d))?", label)
        if not match:
            minimums.append(0)
            maximums.append(0)
            continue
        minimum = int(match.group(1))
        maximum = int(match.group(2) or match.group(1))
        if maximum < minimum:
            minimum, maximum = maximum, minimum
        minimums.append(minimum)
        maximums.append(maximum)

    deltas = [maximum - minimum for minimum, maximum in zip(minimums, maximums)]
    flexible_pairs = pair_flexible_colors(deltas)
    requirements: list[tuple[list[str], str]] = []
    for index, count in enumerate(minimums):
        requirements.extend([([LABEL_COLORS[index]], "square")] * count)
    requirements.extend(([first, second], "diamond") for first, second in flexible_pairs)

    if not requirements:
        requirements = [(["red"], "square"), (["blue"], "square"), (["yellow"], "square")]
    columns = 5 if len(requirements) > 10 else 4
    rows = math.ceil(len(requirements) / columns)
    squares = []
    for index, (allowed, shape) in enumerate(requirements):
        column = index % columns
        row = index // columns
        squares.append(
            {
                "id": f"square-{index + 1}",
                "x": round((column + 1) / (columns + 1), 5),
                "y": round((row + 1) / (rows + 1), 5),
                "allowedColors": allowed,
                "shape": shape,
            }
        )
    return squares, {
        "labels": labels,
        "minimums": minimums,
        "maximums": maximums,
        "flexiblePairs": flexible_pairs,
        "targetCount": len(squares),
        "labelsComplete": all(bool(label) for label in labels),
    }



