from __future__ import annotations

import math
import subprocess
import tempfile
from collections import Counter

import numpy as np
from PIL import Image
from scipy import ndimage

from .image_analysis import detect_targets, ocr

def digit_ocr(
    image: Image.Image,
    box: tuple[float, float, float, float],
    *,
    prefer_binary: bool = False,
) -> str:
    width, height = image.size
    crop = image.convert("L").crop(
        (
            int(width * box[0]),
            int(height * box[1]),
            int(width * box[2]),
            int(height * box[3]),
        )
    )
    binary = crop.point(lambda value: 0 if value < 145 else 255)
    if prefer_binary:
        preferred = "".join(
            re.findall(
                r"\d",
                ocr(
                    binary.resize((binary.width * 5, binary.height * 5)),
                    psm=13,
                    whitelist="0123456789",
                ),
            )
        )
        if 1 <= len(preferred) <= 2:
            return preferred

    candidates: list[str] = []
    for source, modes in (
        (crop, (8, 13)),
        (binary, (13,)),
    ):
        enlarged = source.resize((source.width * 5, source.height * 5))
        for psm in modes:
            text = "".join(
                re.findall(r"\d", ocr(enlarged, psm=psm, whitelist="0123456789"))
            )
            if 1 <= len(text) <= 2:
                candidates.append(text)
    if not candidates:
        return ""
    counts = Counter(candidates)
    return max(counts, key=lambda value: (len(value), counts[value]))


def extract_rewards(image: Image.Image) -> tuple[dict, dict]:
    width, height = image.size
    if width > height:
        boxes = {
            "starValue": (0.88, 0.07, 0.96, 0.18),
            "foodValue": (0.76, 0.78, 0.84, 0.94),
            "paintValue": (0.83, 0.78, 0.94, 0.94),
        }
    else:
        boxes = {
            "starValue": (0.84, 0.05, 0.93, 0.12),
            "foodValue": (0.60, 0.82, 0.72, 0.95),
            "paintValue": (0.79, 0.82, 0.94, 0.95),
        }
    raw = {
        name: digit_ocr(image, box, prefer_binary=name == "foodValue")
        for name, box in boxes.items()
    }
    paint_box = boxes["paintValue"]
    width, height = image.size
    paint_crop = np.asarray(
        image.convert("L").crop(
            (
                int(width * paint_box[0]),
                int(height * paint_box[1]),
                int(width * paint_box[2]),
                int(height * paint_box[3]),
            )
        )
    )
    labels, count = ndimage.label(paint_crop < 140)
    large_components = 0
    for component in ndimage.find_objects(labels):
        if component is None:
            continue
        y_slice, x_slice = component
        component_height = y_slice.stop - y_slice.start
        component_width = x_slice.stop - x_slice.start
        if (
            component_height > paint_crop.shape[0] * 0.25
            and component_width > 3
        ):
            large_components += 1
    if len(raw["paintValue"]) == 1 and large_components >= 2:
        raw["paintValue"] = f"1{raw['paintValue']}"
    parsed = {
        "starValue": int(raw["starValue"]) if raw["starValue"] else 2,
        "foodValue": int(raw["foodValue"]) if raw["foodValue"] else 2,
        "paintValue": int(raw["paintValue"]) if raw["paintValue"] else 7,
    }
    if not 1 <= parsed["starValue"] <= 6:
        parsed["starValue"] = 2
    if not 0 <= parsed["foodValue"] <= 6:
        parsed["foodValue"] = 2
    if not 1 <= parsed["paintValue"] <= 25:
        parsed["paintValue"] = 7
    return parsed, raw


def ocr_character_boxes(image: Image.Image) -> list[tuple[str, int, int, int, int]]:
    with tempfile.NamedTemporaryFile(suffix=".png") as source:
        image.save(source.name)
        result = subprocess.run(
            [
                "tesseract",
                source.name,
                "stdout",
                "--psm",
                "11",
                "makebox",
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    boxes = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 6:
            continue
        character = parts[0]
        try:
            x1, y1, x2, y2 = map(int, parts[1:5])
        except ValueError:
            continue
        boxes.append((character, x1, y1, x2, y2))
    return boxes


def pair_flexible_colors(deltas: list[int]) -> list[tuple[str, str]]:
    remaining = {LABEL_COLORS[index]: count for index, count in enumerate(deltas)}
    pairs: list[tuple[str, str]] = []
    while sum(remaining.values()) >= 2:
        ranked = sorted(
            ((count, color) for color, count in remaining.items() if count > 0),
            reverse=True,
        )
        if len(ranked) < 2:
            break
        first = ranked[0][1]
        second = ranked[1][1]
        remaining[first] -= 1
        remaining[second] -= 1
        pairs.append((first, second))
    return pairs



