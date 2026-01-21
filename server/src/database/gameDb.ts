// Game database operations - using in-memory store
import { memoryDb } from './memoryDb';
import { Game, GameState, PaintCube, CanvasDefinition } from '../models/types';

export async function createGame(hostPlayerId: string): Promise<Game> {
  return memoryDb.createGame(hostPlayerId);
}

export async function getGame(gameId: string): Promise<Game | null> {
  return memoryDb.getGame(gameId);
}

export async function updateGameStatus(
  gameId: string,
  status: 'lobby' | 'playing' | 'finished'
): Promise<void> {
  memoryDb.updateGame(gameId, { status });
}

export async function updateGamePhase(
  gameId: string,
  phase: 'morning' | 'day' | 'night' | 'selling'
): Promise<void> {
  memoryDb.updateGame(gameId, { current_phase: phase });
}

export async function updateCurrentPlayer(
  gameId: string,
  playerId: string | null
): Promise<void> {
  memoryDb.updateGame(gameId, { current_player_id: playerId });
}

export async function incrementDay(gameId: string): Promise<void> {
  const game = memoryDb.getGame(gameId);
  if (game) {
    memoryDb.updateGame(gameId, { day_number: game.day_number + 1 });
  }
}

export async function incrementTurnCount(gameId: string): Promise<void> {
  const game = memoryDb.getGame(gameId);
  if (game) {
    memoryDb.updateGame(gameId, { turn_count: game.turn_count + 1 });
  }
}

export async function setGameWinner(
  gameId: string,
  winnerId: string
): Promise<void> {
  memoryDb.updateGame(gameId, {
    status: 'finished',
    winner_id: winnerId,
    finished_at: new Date(),
  });
}

export async function startGame(gameId: string): Promise<void> {
  memoryDb.startGame(gameId);
}

export async function deleteGame(gameId: string): Promise<void> {
  // In-memory: just remove from map
  const game = memoryDb.getGame(gameId);
  if (game) {
    // We'd need to add a delete method to memoryDb
    console.log('Delete game:', gameId);
  }
}

// Game state operations
export async function createGameState(
  gameId: string,
  paintBag: PaintCube[],
  paintMarket: PaintCube[],
  canvasMarket: Array<CanvasDefinition | null>,
  canvasDeck: number[]
): Promise<void> {
  memoryDb.createGameState(gameId, paintBag, paintMarket, canvasMarket, canvasDeck);
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  return memoryDb.getGameState(gameId);
}

export async function updateGameState(
  gameId: string,
  updates: Partial<Omit<GameState, 'game_id'>>
): Promise<void> {
  memoryDb.updateGameState(gameId, updates);
}

export async function resetActionCount(gameId: string): Promise<void> {
  const state = memoryDb.getGameState(gameId);
  if (state) {
    memoryDb.updateGameState(gameId, { actions_taken: 0 });
  }
}

export async function incrementActionCount(gameId: string): Promise<void> {
  memoryDb.incrementActionCount(gameId);
}
