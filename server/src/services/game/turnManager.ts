// Turn management service
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import { Game, Player } from '../../models/types';
import { GAME_PHASES, MAX_ACTIONS_PER_TURN } from '../../utils/constants';

export async function initializeTurnOrder(
  gameId: string,
  players: Player[]
): Promise<void> {
  if (players.length === 0) return;
  
  // First player in turn order starts
  const firstPlayer = players[0];
  await gameDb.updateCurrentPlayer(gameId, firstPlayer.id);
  await gameDb.updateGamePhase(gameId, 'morning');
}

export async function getNextPlayer(
  gameId: string
): Promise<Player | null> {
  const players = await playerDb.getGamePlayers(gameId);
  const game = await gameDb.getGame(gameId);
  
  if (!game || !game.current_player_id || players.length === 0) {
    return null;
  }
  
  const currentIndex = players.findIndex(p => p.id === game.current_player_id);
  if (currentIndex === -1) return players[0];
  
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex];
}

export async function advanceToNextPlayer(gameId: string): Promise<Player> {
  const nextPlayer = await getNextPlayer(gameId);
  if (!nextPlayer) throw new Error('No next player found');
  
  await gameDb.updateCurrentPlayer(gameId, nextPlayer.id);
  await gameDb.incrementTurnCount(gameId);
  await gameDb.resetActionCount(gameId);
  
  return nextPlayer;
}

export async function advancePhase(gameId: string): Promise<string> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  let nextPhase: string;
  
  switch (game.current_phase) {
    case GAME_PHASES.MORNING:
      nextPhase = GAME_PHASES.DAY;
      await gameDb.updateGamePhase(gameId, 'day');
      break;
      
    case GAME_PHASES.DAY:
      nextPhase = GAME_PHASES.NIGHT;
      await gameDb.updateGamePhase(gameId, 'night');
      break;
      
    case GAME_PHASES.NIGHT:
      // After night, go to selling phase
      nextPhase = GAME_PHASES.SELLING;
      await gameDb.updateGamePhase(gameId, 'selling');
      break;
      
    case GAME_PHASES.SELLING:
      // After selling, start new day
      await gameDb.incrementDay(gameId);
      await decrementAllNutrition(gameId);
      nextPhase = GAME_PHASES.MORNING;
      await gameDb.updateGamePhase(gameId, 'morning');
      
      // Reset to first player
      const players = await playerDb.getGamePlayers(gameId);
      if (players.length > 0) {
        await gameDb.updateCurrentPlayer(gameId, players[0].id);
      }
      break;
      
    default:
      nextPhase = GAME_PHASES.MORNING;
  }
  
  // Reset action count for new phase
  await gameDb.resetActionCount(gameId);
  
  return nextPhase;
}

export async function canPlayerAct(
  gameId: string,
  playerId: string
): Promise<boolean> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.status !== 'playing') return false;
  
  // Can only act during morning, day, or night phases
  if (game.current_phase === 'selling') return false;
  
  // Must be current player's turn
  if (game.current_player_id !== playerId) return false;

  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) return false;

  return gameState.actions_taken < MAX_ACTIONS_PER_TURN;
}

export async function canPlayerEndTurn(
  gameId: string,
  playerId: string
): Promise<boolean> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.status !== 'playing') return false;

  if (game.current_phase === 'selling') return false;

  return game.current_player_id === playerId;
}

export async function decrementAllNutrition(gameId: string): Promise<void> {
  const players = await playerDb.getGamePlayers(gameId);
  
  for (const player of players) {
    const newNutrition = Math.max(0, player.nutrition - 1);
    await playerDb.updatePlayerNutrition(player.id, newNutrition);
  }
}

export async function checkStarvation(gameId: string): Promise<Player[]> {
  const players = await playerDb.getGamePlayers(gameId);
  return players.filter(p => p.nutrition < 1);
}

export async function hasActionAvailable(
  gameId: string
): Promise<boolean> {
  const game = await gameDb.getGame(gameId);
  if (!game) return false;
  
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) return false;
  
  return gameState.actions_taken < MAX_ACTIONS_PER_TURN;
}
