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

from canvas_import.image_analysis import orient_card, slugify
from canvas_import.requirements import extract_requirements
from canvas_import.reward_analysis import extract_rewards


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
