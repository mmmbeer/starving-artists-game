// Player database operations - using MySQL
import { execute, query, queryOne } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { Player, PaintCube } from '../models/types';

type PlayerRow = {
  id: string;
  game_id: string;
  name: string;
  nutrition: number;
  score: number;
  paintings_completed: number;
  food_earned: number;
  turn_order: number;
  is_host: number | boolean;
  connected: number | boolean;
  last_seen: Date;
};

type PaintCubeRow = {
  id: string;
  color: string;
  is_wild: number | boolean;
};

export async function createPlayer(
  gameId: string,
  name: string,
  turnOrder: number,
  isHost: boolean = false,
  playerId?: string
): Promise<Player> {
  const id = playerId ?? uuidv4();
  await execute(
    `INSERT INTO players (id, game_id, name, nutrition, score, paintings_completed, food_earned, turn_order, is_host, connected, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, gameId, name, 5, 0, 0, 0, turnOrder, isHost, true]
  );
  const player = await getPlayer(id);
  if (!player) {
    throw new Error('Failed to create player');
  }
  return player;
}

function mapPlayerRow(row: PlayerRow): Player {
  return {
    id: row.id,
    game_id: row.game_id,
    name: row.name,
    nutrition: row.nutrition,
    score: row.score,
    paintings_completed: row.paintings_completed,
    food_earned: row.food_earned,
    turn_order: row.turn_order,
    is_host: Boolean(row.is_host),
    connected: Boolean(row.connected),
    last_seen: row.last_seen,
  };
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const row = await queryOne<PlayerRow>(
    'SELECT id, game_id, name, nutrition, score, paintings_completed, food_earned, turn_order, is_host, connected, last_seen FROM players WHERE id = ?',
    [playerId]
  );
  return row ? mapPlayerRow(row) : null;
}

export async function getGamePlayers(gameId: string): Promise<Player[]> {
  const rows = await query<PlayerRow>(
    'SELECT id, game_id, name, nutrition, score, paintings_completed, food_earned, turn_order, is_host, connected, last_seen FROM players WHERE game_id = ? ORDER BY turn_order ASC',
    [gameId]
  );
  return rows.map(mapPlayerRow);
}

export async function updatePlayerNutrition(
  playerId: string,
  nutrition: number
): Promise<void> {
  await execute('UPDATE players SET nutrition = ? WHERE id = ?', [nutrition, playerId]);
}

export async function updatePlayerScore(
  playerId: string,
  score: number
): Promise<void> {
  await execute('UPDATE players SET score = ? WHERE id = ?', [score, playerId]);
}

export async function incrementPaintingsCompleted(
  playerId: string
): Promise<void> {
  await execute(
    'UPDATE players SET paintings_completed = paintings_completed + 1 WHERE id = ?',
    [playerId]
  );
}

export async function addFoodEarned(
  playerId: string,
  food: number
): Promise<void> {
  await execute(
    'UPDATE players SET food_earned = food_earned + ? WHERE id = ?',
    [food, playerId]
  );
}

export async function updatePlayerConnection(
  playerId: string,
  connected: boolean
): Promise<void> {
  await execute(
    'UPDATE players SET connected = ?, last_seen = NOW() WHERE id = ?',
    [connected, playerId]
  );
}

export async function deletePlayer(playerId: string): Promise<void> {
  await execute('DELETE FROM players WHERE id = ?', [playerId]);
}

// Player paint cubes
export async function addPaintCube(
  playerId: string,
  gameId: string,
  cube: PaintCube
): Promise<void> {
  await addPaintCubes(playerId, gameId, [cube]);
}

export async function addPaintCubes(
  playerId: string,
  gameId: string,
  cubes: PaintCube[]
): Promise<void> {
  if (cubes.length === 0) return;
  const values = cubes.map(cube => [
    cube.id,
    playerId,
    gameId,
    cube.color,
    cube.is_wild ? 1 : 0,
  ]);
  const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
  await execute(
    `INSERT INTO player_paint_cubes (id, player_id, game_id, color, is_wild) VALUES ${placeholders}`,
    values.flat()
  );
}

export async function getPlayerPaintCubes(
  playerId: string
): Promise<PaintCube[]> {
  const rows = await query<PaintCubeRow>(
    'SELECT id, color, is_wild FROM player_paint_cubes WHERE player_id = ? ORDER BY acquired_at ASC',
    [playerId]
  );
  return rows.map(row => ({
    id: row.id,
    color: row.color as PaintCube['color'],
    is_wild: Boolean(row.is_wild),
  }));
}

export async function removePaintCube(
  playerId: string,
  cubeId: string
): Promise<void> {
  await removePaintCubes(playerId, [cubeId]);
}

export async function removePaintCubes(
  playerId: string,
  cubeIds: string[]
): Promise<void> {
  if (cubeIds.length === 0) return;
  const placeholders = cubeIds.map(() => '?').join(', ');
  await execute(
    `DELETE FROM player_paint_cubes WHERE player_id = ? AND id IN (${placeholders})`,
    [playerId, ...cubeIds]
  );
}

export async function getPlayerPaintCubeCount(playerId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM player_paint_cubes WHERE player_id = ?',
    [playerId]
  );
  return row ? Number(row.count) : 0;
}
