import type { RowDataPacket } from 'mysql2/promise';
import { dbQuery } from './query';
import type { CanvasDefinition, CanvasSquareDefinition } from '../../../shared/types/canvas';
import { PAINT_COLOR_PALETTE } from '../../../shared/types/common';

interface CanvasRow extends RowDataPacket {
  id: number;
  title: string;
  artist: string | null;
  year: string | null;
  star_value: number;
  paint_value: number;
  food_value: number;
  layout_json: string | Record<string, unknown> | null;
  filename: string | null;
}

interface LayoutJson {
  id?: string;
  squares?: unknown;
}

const isPaintColor = (value: unknown): value is CanvasSquareDefinition['allowedColors'][number] =>
  typeof value === 'string' && PAINT_COLOR_PALETTE.includes(value as CanvasSquareDefinition['allowedColors'][number]);

const normalizeAllowedColors = (value: unknown): CanvasSquareDefinition['allowedColors'] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isPaintColor);
};

const parseSquares = (rawSquares: unknown[]): CanvasSquareDefinition[] => {
  return rawSquares
    .map((raw, index) => {
      const square = raw as Record<string, unknown>;
      const position = square.position as Record<string, unknown> | undefined;
      const x = typeof position?.x === 'number' ? position.x : index;
      const y = typeof position?.y === 'number' ? position.y : 0;
      const id = typeof square.id === 'string' && square.id.trim() ? square.id : `square-${index}`;
      return {
        id,
        position: { x, y },
        allowedColors: normalizeAllowedColors(square.allowedColors ?? square.allowed_colors ?? [])
      };
    })
    .sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x));
};

const parseLayoutJson = (raw: CanvasRow['layout_json']): LayoutJson => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as LayoutJson;
    } catch (error) {
      throw new Error('Failed to parse layout_json for canvas row');
    }
  }
  if (raw && typeof raw === 'object') {
    return raw as LayoutJson;
  }
  throw new Error('Canvas layout_json is missing');
};

const buildDefinition = (row: CanvasRow): CanvasDefinition => {
  const layout = parseLayoutJson(row.layout_json);
  if (!Array.isArray(layout.squares) || layout.squares.length === 0) {
    throw new Error(`Canvas ${row.id} is missing square definitions`);
  }

  const id = typeof layout.id === 'string' && layout.id.trim() ? layout.id : `canvas-${row.id}`;
  const squares = parseSquares(layout.squares);

  return {
    id,
    title: row.title,
    artist: row.artist ?? undefined,
    year: row.year ?? undefined,
    filename: row.filename ?? undefined,
    starValue: row.star_value,
    paintValue: row.paint_value,
    foodValue: row.food_value,
    squares
  };
};

export const fetchCanvasDefinitions = async (): Promise<CanvasDefinition[]> => {
  const rows = await dbQuery<CanvasRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases ORDER BY id ASC'
  );

  if (rows.length === 0) {
    throw new Error('No canvases available to build the deck');
  }

  return rows.map(buildDefinition);
};
