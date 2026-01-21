// Canvas database operations
import { query, queryOne, execute } from '../config/database';
import { CanvasDefinition, PlayerCanvas } from '../models/types';
import { generateId } from '../utils/helpers';

export async function getAllCanvasDefinitions(): Promise<CanvasDefinition[]> {
  const sql = 'SELECT * FROM canvas_definitions ORDER BY id';
  const rows = await query<any>(sql);
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    layout_json: JSON.parse(row.layout_json),
    star_value: row.star_value,
    paint_value: row.paint_value,
    food_value: row.food_value,
    image_filename: row.image_filename,
  }));
}

export async function getCanvasDefinition(
  canvasId: number
): Promise<CanvasDefinition | null> {
  const sql = 'SELECT * FROM canvas_definitions WHERE id = ?';
  const row = await queryOne<any>(sql, [canvasId]);
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    layout_json: JSON.parse(row.layout_json),
    star_value: row.star_value,
    paint_value: row.paint_value,
    food_value: row.food_value,
    image_filename: row.image_filename,
  };
}

export async function getCanvasDefinitions(
  canvasIds: number[]
): Promise<CanvasDefinition[]> {
  if (canvasIds.length === 0) return [];
  
  const placeholders = canvasIds.map(() => '?').join(', ');
  const sql = `SELECT * FROM canvas_definitions WHERE id IN (${placeholders})`;
  const rows = await query<any>(sql, canvasIds);
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    layout_json: JSON.parse(row.layout_json),
    star_value: row.star_value,
    paint_value: row.paint_value,
    food_value: row.food_value,
    image_filename: row.image_filename,
  }));
}

// Player canvas operations
export async function addPlayerCanvas(
  playerId: string,
  gameId: string,
  canvasDefinitionId: number
): Promise<PlayerCanvas> {
  const canvasId = generateId();
  const sql = `
    INSERT INTO player_canvases 
    (id, player_id, game_id, canvas_definition_id, painted_squares, completed)
    VALUES (?, ?, ?, ?, '[]', false)
  `;
  
  await execute(sql, [canvasId, playerId, gameId, canvasDefinitionId]);
  
  const canvas = await getPlayerCanvas(canvasId);
  if (!canvas) throw new Error('Failed to create player canvas');
  return canvas;
}

export async function getPlayerCanvas(
  canvasId: string
): Promise<PlayerCanvas | null> {
  const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.id = ?
  `;
  
  const row = await queryOne<any>(sql, [canvasId]);
  if (!row) return null;
  
  return {
    id: row.id,
    player_id: row.player_id,
    game_id: row.game_id,
    canvas_definition_id: row.canvas_definition_id,
    painted_squares: JSON.parse(row.painted_squares),
    completed: row.completed,
    acquired_at: row.acquired_at,
    completed_at: row.completed_at,
    definition: {
      id: row.canvas_definition_id,
      name: row.def_name,
      layout_json: JSON.parse(row.layout_json),
      star_value: row.star_value,
      paint_value: row.paint_value,
      food_value: row.food_value,
      image_filename: row.image_filename,
    },
  };
}

export async function getPlayerCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.player_id = ?
    ORDER BY pc.acquired_at
  `;
  
  const rows = await query<any>(sql, [playerId]);
  
  return rows.map(row => ({
    id: row.id,
    player_id: row.player_id,
    game_id: row.game_id,
    canvas_definition_id: row.canvas_definition_id,
    painted_squares: JSON.parse(row.painted_squares),
    completed: row.completed,
    acquired_at: row.acquired_at,
    completed_at: row.completed_at,
    definition: {
      id: row.canvas_definition_id,
      name: row.def_name,
      layout_json: JSON.parse(row.layout_json),
      star_value: row.star_value,
      paint_value: row.paint_value,
      food_value: row.food_value,
      image_filename: row.image_filename,
    },
  }));
}

export async function updateCanvasPaintedSquares(
  canvasId: string,
  paintedSquares: Array<{ squareId: string; cubeId: string; color: string }>
): Promise<void> {
  const sql = `
    UPDATE player_canvases 
    SET painted_squares = ? 
    WHERE id = ?
  `;
  await execute(sql, [JSON.stringify(paintedSquares), canvasId]);
}

export async function markCanvasCompleted(canvasId: string): Promise<void> {
  const sql = `
    UPDATE player_canvases 
    SET completed = true, completed_at = NOW() 
    WHERE id = ?
  `;
  await execute(sql, [canvasId]);
}

export async function deletePlayerCanvas(canvasId: string): Promise<void> {
  const sql = 'DELETE FROM player_canvases WHERE id = ?';
  await execute(sql, [canvasId]);
}

export async function getCompletedCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.player_id = ? AND pc.completed = true
    ORDER BY pc.completed_at
  `;
  
  const rows = await query<any>(sql, [playerId]);
  
  return rows.map(row => ({
    id: row.id,
    player_id: row.player_id,
    game_id: row.game_id,
    canvas_definition_id: row.canvas_definition_id,
    painted_squares: JSON.parse(row.painted_squares),
    completed: row.completed,
    acquired_at: row.acquired_at,
    completed_at: row.completed_at,
    definition: {
      id: row.canvas_definition_id,
      name: row.def_name,
      layout_json: JSON.parse(row.layout_json),
      star_value: row.star_value,
      paint_value: row.paint_value,
      food_value: row.food_value,
      image_filename: row.image_filename,
    },
  }));
}
