from __future__ import annotations

import math
import subprocess
import tempfile
from collections import Counter

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



