import { env } from "cloudflare:workers";
import { CANVASES } from "./canvas-data";
import {
  PAINT_COLORS,
  type CanvasDefinition,
  type CanvasSquare,
  type PaintColor,
} from "./types";

interface CanvasOverrideRow {
  canvas_id: string;
  definition_json: string;
}

let schemaReady: Promise<void> | null = null;
let catalogCache: {
  expiresAt: number;
  value: CanvasDefinition[];
} | null = null;
const CATALOG_CACHE_MS = 30_000;

function database(): D1Database {
  if (!env.DB) throw new Error("The canvas database is unavailable.");
  return env.DB;
}

export function ensureCanvasSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = database()
    .prepare(
      `CREATE TABLE IF NOT EXISTS canvas_overrides (
        canvas_id TEXT PRIMARY KEY,
        definition_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    )
    .run()
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function integerInRange(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, Math.round(parsed)))
    : fallback;
}

function shortText(value: unknown, fallback: string, maximum: number): string {
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/\s+/g, " ").slice(0, maximum);
}

function isPaintColor(value: unknown): value is PaintColor {
  return (
    typeof value === "string" &&
    (PAINT_COLORS as readonly string[]).includes(value)
  );
}

function normalizeSquare(value: unknown, index: number): CanvasSquare | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const colors = Array.isArray(input.allowedColors)
    ? [...new Set(input.allowedColors.filter(isPaintColor))].slice(0, 2)
    : [];
  if (colors.length < 1) return null;
  const x = Math.min(0.98, Math.max(0.02, finiteNumber(input.x, 0.5)));
  const y = Math.min(0.98, Math.max(0.02, finiteNumber(input.y, 0.5)));
  return {
    id:
      shortText(input.id, `square-${index + 1}`, 80) ||
      `square-${index + 1}`,
    x: Math.round(x * 100000) / 100000,
    y: Math.round(y * 100000) / 100000,
    allowedColors: colors,
    shape: input.shape === "diamond" || colors.length > 1 ? "diamond" : "square",
  };
}

export function normalizeCanvasDefinition(
  value: unknown,
  fallback: CanvasDefinition,
): CanvasDefinition {
  if (!value || typeof value !== "object") return structuredClone(fallback);
  const input = value as Record<string, unknown>;
  const rawSquares = Array.isArray(input.squares) ? input.squares : fallback.squares;
  const seenIds = new Set<string>();
  const squares = rawSquares
    .map(normalizeSquare)
    .filter((square): square is CanvasSquare => Boolean(square))
    .map((square, index) => {
      let id = square.id;
      while (seenIds.has(id)) id = `${square.id}-${index + 1}`;
      seenIds.add(id);
      return { ...square, id };
    })
    .slice(0, 32);

  return {
    id: fallback.id,
    title: shortText(input.title, fallback.title, 120) || fallback.title,
    artist: shortText(input.artist, fallback.artist, 120) || fallback.artist,
    year: shortText(input.year, fallback.year, 40),
    image: fallback.image,
    aspectRatio: fallback.aspectRatio,
    starValue: integerInRange(input.starValue, fallback.starValue, 0, 20),
    foodValue: integerInRange(input.foodValue, fallback.foodValue, 0, 20),
    paintValue: integerInRange(input.paintValue, fallback.paintValue, 0, 50),
    squares,
  };
}

export async function getCanvasCatalog(): Promise<CanvasDefinition[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.value;
  }
  await ensureCanvasSchema();
  const rows = await database()
    .prepare("SELECT canvas_id, definition_json FROM canvas_overrides")
    .all<CanvasOverrideRow>();
  const overrides = new Map(
    rows.results.map((row) => [row.canvas_id, row.definition_json]),
  );
  const value = CANVASES.map((fallback) => {
    const raw = overrides.get(fallback.id);
    if (!raw) return structuredClone(fallback);
    try {
      return normalizeCanvasDefinition(JSON.parse(raw), fallback);
    } catch {
      return structuredClone(fallback);
    }
  });
  catalogCache = {
    expiresAt: Date.now() + CATALOG_CACHE_MS,
    value,
  };
  return value;
}

export async function saveCanvasDefinition(
  canvasId: string,
  value: unknown,
): Promise<CanvasDefinition> {
  const fallback = CANVASES.find((canvas) => canvas.id === canvasId);
  if (!fallback) throw new Error("Canvas not found.");
  const definition = normalizeCanvasDefinition(value, fallback);
  await ensureCanvasSchema();
  const at = new Date().toISOString();
  await database()
    .prepare(
      `INSERT INTO canvas_overrides (canvas_id, definition_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(canvas_id) DO UPDATE SET
         definition_json = excluded.definition_json,
         updated_at = excluded.updated_at`,
    )
    .bind(canvasId, JSON.stringify(definition), at)
    .run();
  catalogCache = null;
  return definition;
}
