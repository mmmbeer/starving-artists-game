import type { CSSProperties } from "react";
import {
  PAINT_COLORS,
  type CanvasDefinition,
  type CanvasSquare,
  type PaintColor,
} from "../../lib/types";

export const REQUIREMENT_COLORS = PAINT_COLORS.filter(
  (color): color is Exclude<PaintColor, "wild"> => color !== "wild",
);

export type LoadState = "checking" | "signed-out" | "loading" | "ready";
export type SaveState = "idle" | "saving" | "saved" | "error";
export type PlacementMode = "single" | "combo";

export const MIN_CANVAS_ZOOM = 0.5;
export const MAX_CANVAS_ZOOM = 2;
export const CANVAS_ZOOM_STEP = 0.25;

export function cloneCanvas(canvas: CanvasDefinition): CanvasDefinition {
  return structuredClone(canvas);
}

export function nextSquareId(squares: CanvasSquare[]): string {
  let number = squares.length + 1;
  const used = new Set(squares.map((square) => square.id));
  while (used.has(`square-${number}`)) number += 1;
  return `square-${number}`;
}

export function paintStyle(colors: PaintColor[]): CSSProperties {
  const values = colors.map((color) => `var(--cube-${color})`);
  const background =
    values.length > 1
      ? `linear-gradient(135deg, ${values[0]} 0 48%, white 49% 51%, ${values[1]} 52% 100%)`
      : values[0] ?? "var(--cube-wild)";
  return { background };
}

export function readError(response: Response, fallback: string): Promise<string> {
  return response
    .json()
    .then((value) => {
      const body = value as { error?: unknown };
      return typeof body.error === "string" && body.error
        ? body.error
        : fallback;
    })
    .catch(() => fallback);
}


