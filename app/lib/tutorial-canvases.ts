import type { CanvasDefinition } from "./types";

export const TUTORIAL_CANVAS_IDS = [
  "katsushika-hokusai-the-great-wave-off-kanagawa-c-1830",
  "vincent-van-gogh-caf-terrace-at-night-1888",
  "vincent-van-gogh-starry-night-1889",
] as const;

export function selectTutorialCanvases(
  canvases: CanvasDefinition[],
): CanvasDefinition[] {
  return TUTORIAL_CANVAS_IDS.map((id) =>
    canvases.find((canvas) => canvas.id === id),
  ).filter((canvas): canvas is CanvasDefinition => Boolean(canvas));
}
