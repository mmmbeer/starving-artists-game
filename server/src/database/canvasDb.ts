// Canvas database operations - definitions in MySQL, player canvases in memory
import { query, queryOne, execute } from '../config/database';
import { memoryDb } from './memoryDb';
import { CanvasDefinition, PlayerCanvas } from '../models/types';

type CanvasDefinitionRow = {
  id: number;
  title: string;
  artist: string | null;
  year: string | null;
  star_value: number;
  paint_value: number;
  food_value: number;
  layout_json: any;
  filename: string | null;
};

function parseLayoutJson(value: any): any {
  if (value === null || value === undefined) return { squares: [] };
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString('utf8'));
  }
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
}

function mapCanvasRow(row: CanvasDefinitionRow): CanvasDefinition {
  return {
    id: row.id,
    name: row.title,
    artist: row.artist || undefined,
    year: row.year || undefined,
    star_value: row.star_value,
    paint_value: row.paint_value,
    food_value: row.food_value,
    layout_json: parseLayoutJson(row.layout_json),
    filename: row.filename,
  };
}

export async function getAllCanvasDefinitions(): Promise<CanvasDefinition[]> {
  const rows = await query<CanvasDefinitionRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases ORDER BY id'
  );
  return rows.map(mapCanvasRow);
}

export async function getCanvasDefinition(
  canvasId: number
): Promise<CanvasDefinition | null> {
  const row = await queryOne<CanvasDefinitionRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases WHERE id = ?',
    [canvasId]
  );
  return row ? mapCanvasRow(row) : null;
}

export async function getCanvasDefinitions(
  canvasIds: number[]
): Promise<CanvasDefinition[]> {
  if (canvasIds.length === 0) return [];
  const rows = await query<CanvasDefinitionRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases WHERE id IN (?)',
    [canvasIds]
  );
  return rows.map(mapCanvasRow);
}

export async function getCanvasDefinitionByFilename(
  filename: string
): Promise<CanvasDefinition | null> {
  const row = await queryOne<CanvasDefinitionRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases WHERE filename = ? LIMIT 1',
    [filename]
  );
  return row ? mapCanvasRow(row) : null;
}

export async function getCanvasDefinitionByTitle(
  title: string
): Promise<CanvasDefinition | null> {
  const row = await queryOne<CanvasDefinitionRow>(
    'SELECT id, title, artist, year, star_value, paint_value, food_value, layout_json, filename FROM canvases WHERE title = ? LIMIT 1',
    [title]
  );
  return row ? mapCanvasRow(row) : null;
}

export async function saveCanvasDefinition(
  id: number | null,
  data: {
    name: string;
    artist?: string;
    year?: string | null;
    star_value: number;
    paint_value: number;
    food_value: number;
    layout_json: any;
    filename?: string | null;
  }
): Promise<CanvasDefinition> {
  const payload = [
    data.name,
    data.artist || null,
    data.year || null,
    data.star_value,
    data.paint_value,
    data.food_value,
    JSON.stringify(data.layout_json),
    data.filename || null,
  ];

  if (id) {
    await execute(
      'UPDATE canvases SET title = ?, artist = ?, year = ?, star_value = ?, paint_value = ?, food_value = ?, layout_json = ?, filename = ? WHERE id = ?',
      [...payload, id]
    );
    const updated = await getCanvasDefinition(id);
    if (!updated) {
      throw new Error('Canvas not found after update');
    }
    return updated;
  }

  const result = await execute(
    'INSERT INTO canvases (title, artist, year, star_value, paint_value, food_value, layout_json, filename) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    payload
  );
  const newId = Number(result.insertId);
  const created = await getCanvasDefinition(newId);
  if (!created) {
    throw new Error('Canvas not found after insert');
  }
  return created;
}

export async function deleteCanvasDefinition(id: number): Promise<boolean> {
  const result = await execute('DELETE FROM canvases WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// Player canvas operations
export async function addPlayerCanvas(
  playerId: string,
  gameId: string,
  canvasDefinitionId: number
): Promise<PlayerCanvas> {
  const canvas = memoryDb.addPlayerCanvas(playerId, gameId, canvasDefinitionId);
  return {
    ...canvas,
    definition: memoryDb.getCanvasDefinition(canvasDefinitionId) || undefined,
  } as PlayerCanvas;
}

export async function getPlayerCanvas(
  canvasId: string
): Promise<PlayerCanvas | null> {
  return memoryDb.getPlayerCanvas(canvasId);
}

export async function getPlayerCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  return memoryDb.getPlayerCanvases(playerId);
}

export async function updateCanvasPaintedSquares(
  canvasId: string,
  paintedSquares: Array<{ squareId: string; cubeId: string; color: string }>
): Promise<void> {
  memoryDb.updateCanvasPaintedSquares(canvasId, paintedSquares);
}

export async function markCanvasCompleted(canvasId: string): Promise<void> {
  memoryDb.markCanvasCompleted(canvasId);
}

export async function deletePlayerCanvas(canvasId: string): Promise<void> {
  console.log('Delete player canvas:', canvasId);
}

export async function getCompletedCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const canvases = memoryDb.getPlayerCanvases(playerId);
  return canvases.filter(c => c.completed);
}
