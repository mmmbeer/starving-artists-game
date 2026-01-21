// Game database operations
import { query, queryOne, execute } from '../config/database';
import { Game, GameState, PaintCube, CanvasDefinition } from '../models/types';
import { generateId } from '../utils/helpers';

export async function createGame(hostPlayerId: string): Promise<Game> {
  const gameId = generateId();
  const sql = `
    INSERT INTO games (id, status, host_player_id, current_phase, day_number)
    VALUES (?, 'lobby', ?, 'morning', 1)
  `;
  
  await execute(sql, [gameId, hostPlayerId]);
  
  const game = await getGame(gameId);
  if (!game) throw new Error('Failed to create game');
  return game;
}

export async function getGame(gameId: string): Promise<Game | null> {
  const sql = 'SELECT * FROM games WHERE id = ?';
  return queryOne<Game>(sql, [gameId]);
}

export async function updateGameStatus(
  gameId: string,
  status: 'lobby' | 'playing' | 'finished'
): Promise<void> {
  const sql = 'UPDATE games SET status = ? WHERE id = ?';
  await execute(sql, [status, gameId]);
}

export async function updateGamePhase(
  gameId: string,
  phase: 'morning' | 'day' | 'night' | 'selling'
): Promise<void> {
  const sql = 'UPDATE games SET current_phase = ? WHERE id = ?';
  await execute(sql, [phase, gameId]);
}

export async function updateCurrentPlayer(
  gameId: string,
  playerId: string | null
): Promise<void> {
  const sql = 'UPDATE games SET current_player_id = ? WHERE id = ?';
  await execute(sql, [playerId, gameId]);
}

export async function incrementDay(gameId: string): Promise<void> {
  const sql = 'UPDATE games SET day_number = day_number + 1 WHERE id = ?';
  await execute(sql, [gameId]);
}

export async function incrementTurnCount(gameId: string): Promise<void> {
  const sql = 'UPDATE games SET turn_count = turn_count + 1 WHERE id = ?';
  await execute(sql, [gameId]);
}

export async function setGameWinner(
  gameId: string,
  winnerId: string
): Promise<void> {
  const sql = `
    UPDATE games 
    SET status = 'finished', winner_id = ?, finished_at = NOW() 
    WHERE id = ?
  `;
  await execute(sql, [winnerId, gameId]);
}

export async function startGame(gameId: string): Promise<void> {
  const sql = `
    UPDATE games 
    SET status = 'playing', started_at = NOW() 
    WHERE id = ?
  `;
  await execute(sql, [gameId]);
}

export async function deleteGame(gameId: string): Promise<void> {
  const sql = 'DELETE FROM games WHERE id = ?';
  await execute(sql, [gameId]);
}

// Game state operations
export async function createGameState(
  gameId: string,
  paintBag: PaintCube[],
  paintMarket: PaintCube[],
  canvasMarket: Array<CanvasDefinition | null>,
  canvasDeck: number[]
): Promise<void> {
  const sql = `
    INSERT INTO game_state (game_id, paint_bag, paint_market, canvas_market, canvas_deck, actions_taken)
    VALUES (?, ?, ?, ?, ?, 0)
  `;
  
  await execute(sql, [
    gameId,
    JSON.stringify(paintBag),
    JSON.stringify(paintMarket),
    JSON.stringify(canvasMarket),
    JSON.stringify(canvasDeck),
  ]);
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  const sql = 'SELECT * FROM game_state WHERE game_id = ?';
  const row = await queryOne<any>(sql, [gameId]);
  
  if (!row) return null;
  
  return {
    game_id: row.game_id,
    paint_bag: JSON.parse(row.paint_bag),
    paint_market: JSON.parse(row.paint_market),
    canvas_market: JSON.parse(row.canvas_market),
    canvas_deck: JSON.parse(row.canvas_deck),
    actions_taken: row.actions_taken,
  };
}

export async function updateGameState(
  gameId: string,
  updates: Partial<Omit<GameState, 'game_id'>>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.paint_bag !== undefined) {
    fields.push('paint_bag = ?');
    values.push(JSON.stringify(updates.paint_bag));
  }
  
  if (updates.paint_market !== undefined) {
    fields.push('paint_market = ?');
    values.push(JSON.stringify(updates.paint_market));
  }
  
  if (updates.canvas_market !== undefined) {
    fields.push('canvas_market = ?');
    values.push(JSON.stringify(updates.canvas_market));
  }
  
  if (updates.canvas_deck !== undefined) {
    fields.push('canvas_deck = ?');
    values.push(JSON.stringify(updates.canvas_deck));
  }
  
  if (updates.actions_taken !== undefined) {
    fields.push('actions_taken = ?');
    values.push(updates.actions_taken);
  }
  
  if (fields.length === 0) return;
  
  values.push(gameId);
  const sql = `UPDATE game_state SET ${fields.join(', ')} WHERE game_id = ?`;
  await execute(sql, values);
}

export async function resetActionCount(gameId: string): Promise<void> {
  const sql = 'UPDATE game_state SET actions_taken = 0 WHERE game_id = ?';
  await execute(sql, [gameId]);
}

export async function incrementActionCount(gameId: string): Promise<void> {
  const sql = 'UPDATE game_state SET actions_taken = actions_taken + 1 WHERE game_id = ?';
  await execute(sql, [gameId]);
}
