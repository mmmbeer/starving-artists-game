// Game database operations - using MySQL
import { execute, queryOne } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Game, GameState, PaintCube, CanvasDefinition, SellingPhaseData } from '../models/types';

type GameRow = {
  id: string;
  status: 'lobby' | 'playing' | 'finished';
  host_player_id: string;
  current_phase: 'morning' | 'day' | 'night' | 'selling';
  current_player_id: string | null;
  day_number: number;
  turn_count: number;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  winner_id: string | null;
};

type GameStateRow = {
  game_id: string;
  paint_bag: any;
  paint_market: any;
  canvas_market: any;
  canvas_deck: any;
  actions_taken: number;
  selling_phase_data: any;
};

function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (Buffer.isBuffer(value)) {
    return JSON.parse(value.toString('utf8'));
  }
  if (typeof value === 'string') {
    return JSON.parse(value);
  }
  return value as T;
}

function mapGameRow(row: GameRow): Game {
  return {
    id: row.id,
    status: row.status,
    host_player_id: row.host_player_id,
    current_phase: row.current_phase,
    current_player_id: row.current_player_id,
    day_number: row.day_number,
    turn_count: row.turn_count,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    winner_id: row.winner_id,
  };
}

function mapGameStateRow(row: GameStateRow): GameState {
  return {
    game_id: row.game_id,
    paint_bag: parseJsonField<PaintCube[]>(row.paint_bag, []),
    paint_market: parseJsonField<PaintCube[]>(row.paint_market, []),
    canvas_market: parseJsonField<Array<CanvasDefinition | null>>(row.canvas_market, []),
    canvas_deck: parseJsonField<number[]>(row.canvas_deck, []),
    actions_taken: row.actions_taken ?? 0,
    selling_phase_data: parseJsonField<SellingPhaseData | undefined>(row.selling_phase_data, undefined),
  };
}

export async function createGame(hostPlayerId: string): Promise<Game> {
  const gameId = uuidv4();
  await execute(
    'INSERT INTO games (id, status, host_player_id, current_phase, current_player_id, day_number, turn_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [gameId, 'lobby', hostPlayerId, 'morning', null, 1, 0]
  );
  const game = await getGame(gameId);
  if (!game) {
    throw new Error('Failed to create game');
  }
  return game;
}

export async function getGame(gameId: string): Promise<Game | null> {
  const row = await queryOne<GameRow>(
    'SELECT id, status, host_player_id, current_phase, current_player_id, day_number, turn_count, created_at, started_at, finished_at, winner_id FROM games WHERE id = ?',
    [gameId]
  );
  return row ? mapGameRow(row) : null;
}

export async function updateGameStatus(
  gameId: string,
  status: 'lobby' | 'playing' | 'finished'
): Promise<void> {
  await execute('UPDATE games SET status = ? WHERE id = ?', [status, gameId]);
}

export async function updateGamePhase(
  gameId: string,
  phase: 'morning' | 'day' | 'night' | 'selling'
): Promise<void> {
  await execute('UPDATE games SET current_phase = ? WHERE id = ?', [phase, gameId]);
}

export async function updateCurrentPlayer(
  gameId: string,
  playerId: string | null
): Promise<void> {
  await execute('UPDATE games SET current_player_id = ? WHERE id = ?', [playerId, gameId]);
}

export async function incrementDay(gameId: string): Promise<void> {
  await execute('UPDATE games SET day_number = day_number + 1 WHERE id = ?', [gameId]);
}

export async function incrementTurnCount(gameId: string): Promise<void> {
  await execute('UPDATE games SET turn_count = turn_count + 1 WHERE id = ?', [gameId]);
}

export async function setGameWinner(
  gameId: string,
  winnerId: string
): Promise<void> {
  await execute(
    'UPDATE games SET status = ?, winner_id = ?, finished_at = NOW() WHERE id = ?',
    ['finished', winnerId, gameId]
  );
}

export async function startGame(gameId: string): Promise<void> {
  await execute('UPDATE games SET status = ?, started_at = NOW() WHERE id = ?', ['playing', gameId]);
}

export async function deleteGame(gameId: string): Promise<void> {
  await execute('DELETE FROM games WHERE id = ?', [gameId]);
}

// Game state operations
export async function createGameState(
  gameId: string,
  paintBag: PaintCube[],
  paintMarket: PaintCube[],
  canvasMarket: Array<CanvasDefinition | null>,
  canvasDeck: number[]
): Promise<void> {
  await execute(
    `INSERT INTO game_state (game_id, paint_bag, paint_market, canvas_market, canvas_deck, actions_taken, selling_phase_data)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE paint_bag = VALUES(paint_bag),
     paint_market = VALUES(paint_market),
     canvas_market = VALUES(canvas_market),
     canvas_deck = VALUES(canvas_deck),
     actions_taken = VALUES(actions_taken),
     selling_phase_data = VALUES(selling_phase_data)`,
    [
      gameId,
      JSON.stringify(paintBag),
      JSON.stringify(paintMarket),
      JSON.stringify(canvasMarket),
      JSON.stringify(canvasDeck),
      0,
      null,
    ]
  );
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  const row = await queryOne<GameStateRow>(
    'SELECT game_id, paint_bag, paint_market, canvas_market, canvas_deck, actions_taken, selling_phase_data FROM game_state WHERE game_id = ?',
    [gameId]
  );
  return row ? mapGameStateRow(row) : null;
}

export async function updateGameState(
  gameId: string,
  updates: Partial<Omit<GameState, 'game_id'>>
): Promise<void> {
  const jsonFields = new Set([
    'paint_bag',
    'paint_market',
    'canvas_market',
    'canvas_deck',
    'selling_phase_data',
  ]);

  const fields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined && key !== 'selling_phase_data') {
      continue;
    }
    fields.push(`${key} = ?`);
    if (jsonFields.has(key)) {
      params.push(value === undefined ? null : JSON.stringify(value));
    } else {
      params.push(value);
    }
  }

  if (fields.length === 0) return;

  await execute(
    `UPDATE game_state SET ${fields.join(', ')} WHERE game_id = ?`,
    [...params, gameId]
  );
}

export async function resetActionCount(gameId: string): Promise<void> {
  await execute('UPDATE game_state SET actions_taken = 0 WHERE game_id = ?', [gameId]);
}

export async function incrementActionCount(gameId: string): Promise<void> {
  await execute('UPDATE game_state SET actions_taken = actions_taken + 1 WHERE game_id = ?', [gameId]);
}
