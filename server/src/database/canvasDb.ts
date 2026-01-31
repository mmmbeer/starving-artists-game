// Canvas database operations - definitions and player canvases in MySQL
import { query, queryOne, execute } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
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

type PlayerCanvasRow = {
  player_canvas_id: string;
  player_id: string;
  game_id: string;
  canvas_definition_id: number;
  painted_squares: any;
  completed: number | boolean;
  acquired_at: Date;
  completed_at: Date | null;
  canvas_id: number;
  title: string;
  artist: string | null;
  year: string | null;
  star_value: number;
  paint_value: number;
  food_value: number;
  layout_json: any;
  filename: string | null;
};

function parseJson(value: any, fallback: any): any {
  if (value === null || value === undefined) return fallback;
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString('utf8'));
  }
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value;
}

function parseLayoutJson(value: any): any {
  return parseJson(value, { squares: [] });
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
  const mapped = rows.map(mapCanvasRow);
  const byId = new Map(mapped.map(canvas => [canvas.id, canvas]));
  return canvasIds.map(id => byId.get(id)).filter(Boolean) as CanvasDefinition[];
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
  const canvasId = uuidv4();
  await execute(
    `INSERT INTO player_canvases (id, player_id, game_id, canvas_definition_id, painted_squares, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [canvasId, playerId, gameId, canvasDefinitionId, JSON.stringify([]), false]
  );
  const canvas = await getPlayerCanvas(canvasId);
  if (!canvas) {
    throw new Error('Failed to create player canvas');
  }
  return canvas;
}

export async function getPlayerCanvas(
  canvasId: string
): Promise<PlayerCanvas | null> {
  const row = await queryOne<PlayerCanvasRow>(
    `SELECT
      pc.id as player_canvas_id,
      pc.player_id,
      pc.game_id,
      pc.canvas_definition_id,
      pc.painted_squares,
      pc.completed,
      pc.acquired_at,
      pc.completed_at,
      c.id as canvas_id,
      c.title,
      c.artist,
      c.year,
      c.star_value,
      c.paint_value,
      c.food_value,
      c.layout_json,
      c.filename
    FROM player_canvases pc
    JOIN canvases c ON c.id = pc.canvas_definition_id
    WHERE pc.id = ?`,
    [canvasId]
  );
  if (!row) return null;
  const definition = mapCanvasRow({
    id: row.canvas_id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    star_value: row.star_value,
    paint_value: row.paint_value,
    food_value: row.food_value,
    layout_json: row.layout_json,
    filename: row.filename,
  });
  return {
    id: row.player_canvas_id,
    player_id: row.player_id,
    game_id: row.game_id,
    canvas_definition_id: row.canvas_definition_id,
    painted_squares: parseJson(row.painted_squares, []),
    completed: Boolean(row.completed),
    acquired_at: row.acquired_at,
    completed_at: row.completed_at,
    definition,
  };
}

export async function getPlayerCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const rows = await query<PlayerCanvasRow>(
    `SELECT
      pc.id as player_canvas_id,
      pc.player_id,
      pc.game_id,
      pc.canvas_definition_id,
      pc.painted_squares,
      pc.completed,
      pc.acquired_at,
      pc.completed_at,
      c.id as canvas_id,
      c.title,
      c.artist,
      c.year,
      c.star_value,
      c.paint_value,
      c.food_value,
      c.layout_json,
      c.filename
    FROM player_canvases pc
    JOIN canvases c ON c.id = pc.canvas_definition_id
    WHERE pc.player_id = ?
    ORDER BY pc.acquired_at ASC`,
    [playerId]
  );
  return rows.map(row => {
    const definition = mapCanvasRow({
      id: row.canvas_id,
      title: row.title,
      artist: row.artist,
      year: row.year,
      star_value: row.star_value,
      paint_value: row.paint_value,
      food_value: row.food_value,
      layout_json: row.layout_json,
      filename: row.filename,
    });
    return {
      id: row.player_canvas_id,
      player_id: row.player_id,
      game_id: row.game_id,
      canvas_definition_id: row.canvas_definition_id,
      painted_squares: parseJson(row.painted_squares, []),
      completed: Boolean(row.completed),
      acquired_at: row.acquired_at,
      completed_at: row.completed_at,
      definition,
    };
  });
}

export async function updateCanvasPaintedSquares(
  canvasId: string,
  paintedSquares: Array<{ squareId: string; cubeId: string; color: string }>
): Promise<void> {
  await execute(
    'UPDATE player_canvases SET painted_squares = ? WHERE id = ?',
    [JSON.stringify(paintedSquares), canvasId]
  );
}

export async function markCanvasCompleted(canvasId: string): Promise<void> {
  await execute(
    'UPDATE player_canvases SET completed = ?, completed_at = NOW() WHERE id = ?',
    [true, canvasId]
  );
}

export async function deletePlayerCanvas(canvasId: string): Promise<void> {
  await execute('DELETE FROM player_canvases WHERE id = ?', [canvasId]);
}

export async function getCompletedCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const rows = await query<PlayerCanvasRow>(
    `SELECT
      pc.id as player_canvas_id,
      pc.player_id,
      pc.game_id,
      pc.canvas_definition_id,
      pc.painted_squares,
      pc.completed,
      pc.acquired_at,
      pc.completed_at,
      c.id as canvas_id,
      c.title,
      c.artist,
      c.year,
      c.star_value,
      c.paint_value,
      c.food_value,
      c.layout_json,
      c.filename
    FROM player_canvases pc
    JOIN canvases c ON c.id = pc.canvas_definition_id
    WHERE pc.player_id = ? AND pc.completed = true
    ORDER BY pc.completed_at ASC`,
    [playerId]
  );
  return rows.map(row => {
    const definition = mapCanvasRow({
      id: row.canvas_id,
      title: row.title,
      artist: row.artist,
      year: row.year,
      star_value: row.star_value,
      paint_value: row.paint_value,
      food_value: row.food_value,
      layout_json: row.layout_json,
      filename: row.filename,
    });
    return {
      id: row.player_canvas_id,
      player_id: row.player_id,
      game_id: row.game_id,
      canvas_definition_id: row.canvas_definition_id,
      painted_squares: parseJson(row.painted_squares, []),
      completed: Boolean(row.completed),
      acquired_at: row.acquired_at,
      completed_at: row.completed_at,
      definition,
    };
  });
}
