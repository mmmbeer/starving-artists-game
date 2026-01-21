// Player database operations - using in-memory store
import { memoryDb } from './memoryDb';
import { Player, PaintCube } from '../models/types';

export async function createPlayer(
  gameId: string,
  name: string,
  turnOrder: number,
  isHost: boolean = false
): Promise<Player> {
  const player = memoryDb.createPlayer(gameId, name, isHost);
  memoryDb.updatePlayer(player.id, { turn_order: turnOrder });
  return player;
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  return memoryDb.getPlayer(playerId);
}

export async function getGamePlayers(gameId: string): Promise<Player[]> {
  return memoryDb.getGamePlayers(gameId);
}

export async function updatePlayerNutrition(
  playerId: string,
  nutrition: number
): Promise<void> {
  memoryDb.updatePlayer(playerId, { nutrition });
}

export async function updatePlayerScore(
  playerId: string,
  score: number
): Promise<void> {
  memoryDb.updatePlayer(playerId, { score });
}

export async function incrementPaintingsCompleted(
  playerId: string
): Promise<void> {
  const player = memoryDb.getPlayer(playerId);
  if (player) {
    memoryDb.updatePlayer(playerId, {
      paintings_completed: player.paintings_completed + 1,
    });
  }
}

export async function addFoodEarned(
  playerId: string,
  food: number
): Promise<void> {
  const player = memoryDb.getPlayer(playerId);
  if (player) {
    memoryDb.updatePlayer(playerId, {
      food_earned: player.food_earned + food,
    });
  }
}

export async function updatePlayerConnection(
  playerId: string,
  connected: boolean
): Promise<void> {
  memoryDb.updatePlayer(playerId, {
    connected,
    last_seen: new Date(),
  });
}

export async function deletePlayer(playerId: string): Promise<void> {
  // In-memory: would need delete method
  console.log('Delete player:', playerId);
}

// Player paint cubes
export async function addPaintCube(
  playerId: string,
  gameId: string,
  cube: PaintCube
): Promise<void> {
  memoryDb.addPaintCubes(playerId, [cube]);
}

export async function addPaintCubes(
  playerId: string,
  gameId: string,
  cubes: PaintCube[]
): Promise<void> {
  memoryDb.addPaintCubes(playerId, cubes);
}

export async function getPlayerPaintCubes(
  playerId: string
): Promise<PaintCube[]> {
  return memoryDb.getPlayerPaintCubes(playerId);
}

export async function removePaintCube(
  playerId: string,
  cubeId: string
): Promise<void> {
  memoryDb.removePaintCubes(playerId, [cubeId]);
}

export async function removePaintCubes(
  playerId: string,
  cubeIds: string[]
): Promise<void> {
  memoryDb.removePaintCubes(playerId, cubeIds);
}

export async function getPlayerPaintCubeCount(playerId: string): Promise<number> {
  const cubes = memoryDb.getPlayerPaintCubes(playerId);
  return cubes.length;
}
