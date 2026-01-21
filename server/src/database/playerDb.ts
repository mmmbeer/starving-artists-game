// Player database operations
import { query, queryOne, execute } from '../config/database';
import { Player, PaintCube } from '../models/types';
import { generateId } from '../utils/helpers';

export async function createPlayer(
  gameId: string,
  name: string,
  turnOrder: number,
  isHost: boolean = false
): Promise<Player> {
  const playerId = generateId();
  const sql = `
    INSERT INTO players 
    (id, game_id, name, nutrition, score, paintings_completed, food_earned, turn_order, is_host, connected)
    VALUES (?, ?, ?, 5, 0, 0, 0, ?, ?, true)
  `;
  
  await execute(sql, [playerId, gameId, name, turnOrder, isHost]);
  
  const player = await getPlayer(playerId);
  if (!player) throw new Error('Failed to create player');
  return player;
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const sql = 'SELECT * FROM players WHERE id = ?';
  return queryOne<Player>(sql, [playerId]);
}

export async function getGamePlayers(gameId: string): Promise<Player[]> {
  const sql = 'SELECT * FROM players WHERE game_id = ? ORDER BY turn_order';
  return query<Player>(sql, [gameId]);
}

export async function updatePlayerNutrition(
  playerId: string,
  nutrition: number
): Promise<void> {
  const sql = 'UPDATE players SET nutrition = ? WHERE id = ?';
  await execute(sql, [nutrition, playerId]);
}

export async function updatePlayerScore(
  playerId: string,
  score: number
): Promise<void> {
  const sql = 'UPDATE players SET score = ? WHERE id = ?';
  await execute(sql, [score, playerId]);
}

export async function incrementPaintingsCompleted(
  playerId: string
): Promise<void> {
  const sql = `
    UPDATE players 
    SET paintings_completed = paintings_completed + 1 
    WHERE id = ?
  `;
  await execute(sql, [playerId]);
}

export async function addFoodEarned(
  playerId: string,
  food: number
): Promise<void> {
  const sql = 'UPDATE players SET food_earned = food_earned + ? WHERE id = ?';
  await execute(sql, [food, playerId]);
}

export async function updatePlayerConnection(
  playerId: string,
  connected: boolean
): Promise<void> {
  const sql = 'UPDATE players SET connected = ?, last_seen = NOW() WHERE id = ?';
  await execute(sql, [connected, playerId]);
}

export async function deletePlayer(playerId: string): Promise<void> {
  const sql = 'DELETE FROM players WHERE id = ?';
  await execute(sql, [playerId]);
}

// Player paint cubes
export async function addPaintCube(
  playerId: string,
  gameId: string,
  cube: PaintCube
): Promise<void> {
  const sql = `
    INSERT INTO player_paint_cubes (id, player_id, game_id, color, is_wild)
    VALUES (?, ?, ?, ?, ?)
  `;
  await execute(sql, [cube.id, playerId, gameId, cube.color, cube.is_wild]);
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
    cube.is_wild,
  ]);
  
  const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const sql = `
    INSERT INTO player_paint_cubes (id, player_id, game_id, color, is_wild)
    VALUES ${placeholders}
  `;
  
  await execute(sql, values.flat());
}

export async function getPlayerPaintCubes(
  playerId: string
): Promise<PaintCube[]> {
  const sql = `
    SELECT id, color, is_wild 
    FROM player_paint_cubes 
    WHERE player_id = ?
    ORDER BY acquired_at
  `;
  return query<PaintCube>(sql, [playerId]);
}

export async function removePaintCube(
  playerId: string,
  cubeId: string
): Promise<void> {
  const sql = 'DELETE FROM player_paint_cubes WHERE player_id = ? AND id = ?';
  await execute(sql, [playerId, cubeId]);
}

export async function removePaintCubes(
  playerId: string,
  cubeIds: string[]
): Promise<void> {
  if (cubeIds.length === 0) return;
  
  const placeholders = cubeIds.map(() => '?').join(', ');
  const sql = `
    DELETE FROM player_paint_cubes 
    WHERE player_id = ? AND id IN (${placeholders})
  `;
  await execute(sql, [playerId, ...cubeIds]);
}

export async function getPlayerPaintCubeCount(playerId: string): Promise<number> {
  const sql = 'SELECT COUNT(*) as count FROM player_paint_cubes WHERE player_id = ?';
  const result = await queryOne<{ count: number }>(sql, [playerId]);
  return result?.count || 0;
}
