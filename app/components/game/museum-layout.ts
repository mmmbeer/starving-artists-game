import type { MuseumArtwork, MuseumCrop, MuseumPlacement, MuseumSlot } from "./config";
import { MUSEUM_DEFAULT_PLACEMENTS, MUSEUM_FALLBACK_ART } from "./config";

export function shuffleMuseumQueue(indices: number[]) {
  const shuffled = [...indices];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[selected]] = [
      shuffled[selected],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function clampMuseumValue(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function museumArtworkCrop(artwork: MuseumArtwork): MuseumCrop {
  const landscape = artwork.aspectRatio > 1;
  const crop = landscape
    ? { left: 0.043, top: 0.066, width: 0.913, height: 0.689 }
    : { left: 0.066, top: 0.044, width: 0.87, height: 0.777 };

  return {
    aspectRatio: artwork.aspectRatio * (crop.width / crop.height),
    imageWidth: 100 / crop.width,
    imageHeight: 100 / crop.height,
    imageLeft: (-crop.left / crop.width) * 100,
    imageTop: (-crop.top / crop.height) * 100,
  };
}

export function createMuseumPlacement(
  artwork: MuseumArtwork,
  bounds: { width: number; height: number },
  band: number,
  bandCount: number,
): MuseumPlacement {
  const artworkCrop = museumArtworkCrop(artwork);
  const margin = clampMuseumValue(bounds.width * 0.035, 10, 22);
  const floorSpace = clampMuseumValue(bounds.height * 0.07, 28, 48);
  const usableHeight = Math.max(300, bounds.height - floorSpace);
  const bandHeight = usableHeight / Math.max(1, bandCount);
  const maximumArtHeight = Math.min(
    156,
    bandHeight * 0.72,
    bounds.width * 0.32,
  );
  const minimumArtHeight = Math.min(102, maximumArtHeight);
  const artHeight =
    minimumArtHeight +
    Math.random() * Math.max(0, maximumArtHeight - minimumArtHeight);
  const artWidth = clampMuseumValue(
    artHeight * artworkCrop.aspectRatio,
    artHeight * 0.62,
    bounds.width * 0.52,
  );
  const placardWidth = clampMuseumValue(bounds.width * 0.245, 82, 138);
  const gap = clampMuseumValue(bounds.width * 0.032, 9, 18);
  const totalWidth = artWidth + placardWidth + gap;
  const maximumX = Math.max(margin, bounds.width - totalWidth - margin);
  const x = margin + Math.random() * Math.max(0, maximumX - margin);
  const bandTop = band * bandHeight + margin;
  const figureHeight = Math.max(artHeight, 78);
  const maximumY = Math.max(
    bandTop,
    (band + 1) * bandHeight - figureHeight - margin,
  );

  return {
    x,
    y: bandTop + Math.random() * Math.max(0, maximumY - bandTop),
    artWidth,
    artHeight,
    placardWidth,
    gap,
    tilt: -1.15 + Math.random() * 2.3,
    band,
    reverse: Math.random() > 0.72,
  };
}

export function museumBackgroundWorkPaused(): boolean {
  if (typeof document === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean };
    }
  ).connection;
  return (
    document.hidden ||
    connection?.saveData === true ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function museumSlotRange(bounds: { width: number; height: number }) {
  const maximum = Math.round(
    clampMuseumValue(
      Math.floor((bounds.height - 32) / 108),
      bounds.width < 390 ? 3 : 4,
      6,
    ),
  );
  return {
    minimum: Math.max(2, maximum - 2),
    maximum,
  };
}

export function chooseMuseumSlotCount(
  bounds: { width: number; height: number },
  artworkCount: number,
) {
  const range = museumSlotRange(bounds);
  const maximum = Math.min(range.maximum, artworkCount);
  const minimum = Math.min(range.minimum, maximum);
  return (
    minimum + Math.floor(Math.random() * Math.max(1, maximum - minimum + 1))
  );
}

export function arrangeMuseumSlots(
  current: MuseumSlot[],
  count: number,
  artworks: MuseumArtwork[],
  bounds: { width: number; height: number },
) {
  const selected = shuffleMuseumQueue(
    current.map((_, index) => index),
  )
    .slice(0, count)
    .map((index) => current[index]);
  const visible = new Set(selected.map((slot) => slot.artIndex));
  const additions = shuffleMuseumQueue(
    artworks
      .map((_, index) => index)
      .filter((index) => !visible.has(index)),
  );

  while (selected.length < count) {
    const artIndex = additions.shift();
    if (artIndex === undefined) break;
    selected.push({
      artIndex,
      phase: "arriving",
      placement: MUSEUM_DEFAULT_PLACEMENTS[
        selected.length % MUSEUM_DEFAULT_PLACEMENTS.length
      ],
    });
  }

  const bands = shuffleMuseumQueue(
    Array.from({ length: selected.length }, (_, index) => index),
  );
  return selected.map((slot, index) => ({
    ...slot,
    placement: createMuseumPlacement(
      artworks[slot.artIndex] ?? MUSEUM_FALLBACK_ART[0],
      bounds,
      bands[index],
      selected.length,
    ),
  }));
}


