#!/usr/bin/env python3
"""Normalize Starving Artists cards and extract their playable paint targets.

The source card scans contain both portrait and landscape cards stored in a
single portrait-sized PNG canvas. This importer rotates each card so its title
rail is at the bottom, compresses it for the web, locates the printed paint
targets, classifies their colors, and emits TypeScript data consumed by the
game.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import tempfile
import unicodedata
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


COLORS = (
    ("red", 0.0),
    ("orange", 30.0),
    ("yellow", 60.0),
    ("green", 120.0),
    ("blue", 205.0),
    ("purple", 285.0),
)
LABEL_COLORS = ("red", "orange", "yellow", "green", "blue", "purple", "black")


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "untitled"


def normalized_words(value: str) -> set[str]:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return {
        word
        for word in re.findall(r"[a-z0-9]+", value.lower())
        if len(word) > 2 and word not in {"the", "and", "with", "from"}
    }


def ocr(image: Image.Image, psm: int = 11, whitelist: str | None = None) -> str:
    with tempfile.NamedTemporaryFile(suffix=".png") as source:
        image.save(source.name)
        command = ["tesseract", source.name, "stdout", "--psm", str(psm)]
        if whitelist:
            command.extend(["-c", f"tessedit_char_whitelist={whitelist}"])
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
    return result.stdout.strip()


def orient_card(image: Image.Image, expected_text: str) -> tuple[Image.Image, int, float]:
    expected = normalized_words(expected_text)
    best: tuple[float, int, Image.Image] | None = None
    for degrees in (0, 90, 180, 270):
        candidate = image.rotate(degrees, expand=True)
        width, height = candidate.size
        band = candidate.crop((0, int(height * 0.68), width, height)).convert("L")
        binary = band.point(lambda value: 0 if value > 205 else 255)
        text = ocr(binary, psm=11)
        found = normalized_words(text)
        overlap = len(expected & found)
        coverage = overlap / max(1, len(expected))
        score = coverage * 10 + overlap + min(len(text), 240) / 1000
        if best is None or score > best[0]:
            best = (score, degrees, candidate)
    assert best is not None
    return best[2], best[1], best[0]


def hsv_channels(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    data = rgb.astype(np.float32) / 255.0
    maximum = data.max(axis=2)
    minimum = data.min(axis=2)
    delta = maximum - minimum
    saturation = np.divide(
        delta,
        maximum,
        out=np.zeros_like(maximum),
        where=maximum > 0,
    )
    hue = np.zeros_like(maximum)
    nonzero = delta > 1e-6
    red, green, blue = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    index = (maximum == red) & nonzero
    hue[index] = ((green[index] - blue[index]) / delta[index]) % 6
    index = (maximum == green) & nonzero
    hue[index] = (blue[index] - red[index]) / delta[index] + 2
    index = (maximum == blue) & nonzero
    hue[index] = (red[index] - green[index]) / delta[index] + 4
    return hue * 60.0, saturation, maximum


def hue_weight(
    hue: np.ndarray,
    saturation: np.ndarray,
    mask: np.ndarray,
    target: float,
    spread: float = 15.0,
) -> float:
    distance = np.abs((hue - target + 180.0) % 360.0 - 180.0)
    values = saturation[mask] * np.exp(-((distance[mask] / spread) ** 2))
    return float(values.mean()) if values.size else 0.0


def classify_target(
    x: int,
    y: int,
    hue: np.ndarray,
    saturation: np.ndarray,
    value: np.ndarray,
) -> tuple[list[str], str, float, float]:
    radius = 100
    patch_hue = hue[y - radius : y + radius + 1, x - radius : x + radius + 1]
    patch_sat = saturation[y - radius : y + radius + 1, x - radius : x + radius + 1]
    patch_val = value[y - radius : y + radius + 1, x - radius : x + radius + 1]
    yy, xx = np.ogrid[-radius : radius + 1, -radius : radius + 1]

    corner_values = []
    axis_values = []
    for dx, dy in ((-40, -40), (40, -40), (-40, 40), (40, 40)):
        corner_values.append(
            patch_sat[radius + dy - 5 : radius + dy + 6, radius + dx - 5 : radius + dx + 6].mean()
        )
    for dx, dy in ((0, -40), (40, 0), (0, 40), (-40, 0)):
        axis_values.append(
            patch_sat[radius + dy - 5 : radius + dy + 6, radius + dx - 5 : radius + dx + 6].mean()
        )
    diamond_confidence = float(np.mean(corner_values) - np.mean(axis_values))
    is_diamond = diamond_confidence > 0.24

    if is_diamond:
        distance = np.abs(xx) + np.abs(yy)
        ring = (distance >= 76) & (distance <= 96)
        raw_scores = [
            (name, hue_weight(patch_hue, patch_sat, ring, target, 18.0))
            for name, target in COLORS
        ]
        raw_scores.sort(key=lambda entry: entry[1], reverse=True)
        allowed = [raw_scores[0][0], raw_scores[1][0]]
        return allowed, "diamond", diamond_confidence, diamond_confidence

    distance = np.maximum(np.abs(xx), np.abs(yy))
    ring = (distance >= 55) & (distance <= 64)
    outside = (distance >= 68) & (distance <= 77)
    difference_scores = []
    for name, target in COLORS:
        ring_score = hue_weight(patch_hue, patch_sat, ring, target)
        outside_score = hue_weight(patch_hue, patch_sat, outside, target)
        difference_scores.append((name, ring_score - outside_score))
    difference_scores.sort(key=lambda entry: entry[1], reverse=True)

    ring_value = float(patch_val[ring].mean())
    outside_value = float(patch_val[outside].mean())
    black_evidence = max(0.0, outside_value - ring_value)
    if difference_scores[0][1] < 0.025 and (
        ring_value < 0.46 or outside_value - ring_value > 0.055
    ):
        return ["black"], "square", diamond_confidence, black_evidence
    return [
        difference_scores[0][0]
    ], "square", diamond_confidence, difference_scores[0][1]


def detect_targets(image: Image.Image) -> tuple[list[dict], dict]:
    rgb = np.asarray(image.convert("RGB"))
    width, height = image.size
    hue, saturation, value = hsv_channels(rgb)
    art_height = int(height * (0.79 if width > height else 0.82))

    center_size = 71
    outer_size = 157
    center_sat = ndimage.uniform_filter(saturation, size=center_size)
    outer_sat = ndimage.uniform_filter(saturation, size=outer_size)
    center_area = center_size * center_size
    outer_area = outer_size * outer_size
    ring_sat = (
        outer_sat * outer_area - center_sat * center_area
    ) / (outer_area - center_area)
    center_value = ndimage.uniform_filter(value, size=center_size)
    score = (ring_sat - center_sat) * np.clip((center_value - 0.32) / 0.42, 0, 1)
    maxima = ndimage.maximum_filter(score, size=86)
    points = np.argwhere((score == maxima) & (score > 0.145))

    candidates: list[tuple[float, int, int]] = []
    for y, x in points:
        if x < 101 or x > width - 101 or y < 101 or y > art_height - 45:
            continue
        if x > width * 0.79 and y < height * 0.23:
            continue
        if center_sat[y, x] > 0.33:
            continue
        candidates.append((float(score[y, x]), int(x), int(y)))
    candidates.sort(reverse=True)

    accepted: list[tuple[float, int, int]] = []
    for candidate in candidates:
        _, x, y = candidate
        if any(math.hypot(x - other_x, y - other_y) < 88 for _, other_x, other_y in accepted):
            continue
        accepted.append(candidate)

    targets = []
    for index, (target_score, x, y) in enumerate(sorted(accepted, key=lambda item: (item[2], item[1]))):
        allowed, shape, diamond_confidence, classification_evidence = classify_target(
            x, y, hue, saturation, value
        )
        if classification_evidence < 0.018:
            continue
        targets.append(
            {
                "id": f"square-{index + 1}",
                "x": round(x / width, 5),
                "y": round(y / height, 5),
                "allowedColors": allowed,
                "shape": shape,
                "confidence": round(target_score, 4),
                "shapeConfidence": round(diamond_confidence, 4),
                "classificationEvidence": round(classification_evidence, 4),
            }
        )

    report = {
        "targetCount": len(targets),
        "colors": dict(Counter(color for target in targets for color in target["allowedColors"])),
        "minimumConfidence": round(min((target["confidence"] for target in targets), default=0), 4),
    }
    return targets, report


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


def parse_filename(path: Path) -> tuple[str, str, str]:
    stem = path.stem
    artist, separator, remainder = stem.partition(" - ")
    if not separator:
        artist, remainder = "Unknown Artist", stem
    year_match = re.search(r"\(([^()]*(?:\([^()]*\)[^()]*)?)\)\s*$", remainder)
    year = year_match.group(1).strip() if year_match else ""
    title = remainder[: year_match.start()].strip() if year_match else remainder.strip()
    return artist.strip(), title, year


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--public", type=Path, required=True)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    source_files = sorted(args.source.glob("*.png"))
    args.public.mkdir(parents=True, exist_ok=True)
    args.data.parent.mkdir(parents=True, exist_ok=True)
    cards = []
    reports = []

    for number, source_path in enumerate(source_files, start=1):
        artist, title, year = parse_filename(source_path)
        original = Image.open(source_path).convert("RGB")
        oriented, rotation, orientation_score = orient_card(
            original, f"{artist} {title} {year}"
        )
        rewards, raw_rewards = extract_rewards(oriented)
        targets, target_report = extract_requirements(oriented)
        card_id = slugify(f"{artist}-{title}-{year}")
        web_name = f"{card_id}.webp"
        output = oriented.copy()
        output.thumbnail((720, 1100), Image.Resampling.LANCZOS)
        output.save(args.public / web_name, "WEBP", quality=72, method=6)

        card = {
            "id": card_id,
            "title": title,
            "artist": artist,
            "year": year,
            "image": f"/canvases/{web_name}",
            "aspectRatio": round(oriented.width / oriented.height, 5),
            **rewards,
            "squares": [
                {
                    key: value
                    for key, value in target.items()
                    if key
                    not in {
                        "confidence",
                        "shapeConfidence",
                        "classificationEvidence",
                    }
                }
                for target in targets
            ],
        }
        cards.append(card)
        reports.append(
            {
                "file": source_path.name,
                "id": card_id,
                "rotation": rotation,
                "orientationScore": round(orientation_score, 3),
                "rawRewards": raw_rewards,
                "rewards": rewards,
            **target_report,
            }
        )
        print(
            f"[{number:03d}/{len(source_files):03d}] {source_path.name}: "
            f"{len(targets)} targets, rotation {rotation}, rewards {rewards}"
        )

    data_json = json.dumps(cards, ensure_ascii=False, separators=(",", ":"))
    args.data.write_text(
        "import type { CanvasDefinition } from \"./types\";\n\n"
        f"export const CANVASES: CanvasDefinition[] = {data_json};\n",
        encoding="utf-8",
    )
    args.report.write_text(
        json.dumps(reports, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
