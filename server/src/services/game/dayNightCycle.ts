// Day/Night Cycle Service
// Manages the progression of game phases and day transitions

import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import { drawPaintCubes } from '../paint/paintBag';
import { Game, Player, GameState } from '../../models/types';
import { PAINT_MARKET_REFILL_SIZE, WIN_CONDITIONS } from '../../utils/constants';

export interface PhaseTransitionResult {
  newPhase: Game['current_phase'];
  newDay?: number;
  nutritionChanges?: Array<{ playerId: string; oldNutrition: number; newNutrition: number }>;
  eliminatedPlayers?: Player[];
  sellingPhaseStarted?: boolean;
  refillDetails?: { cubesAdded: number };
  winner?: Player;
}

/**
 * End the current player's turn and potentially advance the phase
 */
export async function handleEndTurn(
  gameId: string,
  playerId: string
): Promise<{
  nextPlayerId: string;
  phaseChanged: boolean;
  phaseResult?: PhaseTransitionResult;
}> {
  const game = await gameDb.getGame(gameId);
  const players = await playerDb.getGamePlayers(gameId);
  
  if (!game) throw new Error('Game not found');

  const currentPlayerIndex = players.findIndex(p => p.id === playerId);
  if (currentPlayerIndex === -1) throw new Error('Player not in game');

  const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const nextPlayer = players[nextPlayerIndex];

  // Check if we've completed a round (all players have taken a turn)
  const isRoundComplete = nextPlayerIndex === 0;

  await gameDb.updateCurrentPlayer(gameId, nextPlayer.id);
  await gameDb.incrementTurnCount(gameId);
  await gameDb.resetActionCount(gameId);

  if (isRoundComplete) {
    // Advance to next phase
    const phaseResult = await advancePhase(gameId);
    return {
      nextPlayerId: nextPlayer.id,
      phaseChanged: true,
      phaseResult,
    };
  }

  return {
    nextPlayerId: nextPlayer.id,
    phaseChanged: false,
  };
}

/**
 * Advance to the next game phase
 */
export async function advancePhase(gameId: string): Promise<PhaseTransitionResult> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');

  const currentPhase = game.current_phase;
  let result: PhaseTransitionResult;

  switch (currentPhase) {
    case 'morning':
      // Morning -> Day
      await gameDb.updateGamePhase(gameId, 'day');
      result = { newPhase: 'day' };
      break;

    case 'day':
      // Day -> Night
      await gameDb.updateGamePhase(gameId, 'night');
      result = { newPhase: 'night' };
      break;

    case 'night':
      // Night progression is driven by explicit sell submissions.
      throw new Error('Night phase requires sell submissions from players');
      break;

    case 'selling':
      // Selling -> New day (Morning)
      result = await handleSellingEnd(gameId);
      break;

    default:
      await gameDb.updateGamePhase(gameId, 'morning');
      result = { newPhase: 'morning' };
  }

  // Reset action count for new phase
  await gameDb.resetActionCount(gameId);

  return result;
}

/**
 * Handle the end of selling phase
 */
async function handleSellingEnd(gameId: string): Promise<PhaseTransitionResult> {
  const gameState = await gameDb.getGameState(gameId);
  
  // Clear selling phase data
  if (gameState) {
    await gameDb.updateGameState(gameId, {
      selling_phase_data: undefined,
    });
  }

  return await startNewDay(gameId);
}

/**
 * Start a new day - deduct nutrition, check eliminations, refill market
 */
async function startNewDay(gameId: string): Promise<PhaseTransitionResult> {
  const players = await playerDb.getGamePlayers(gameId);
  const gameState = await gameDb.getGameState(gameId);
  
  // Deduct nutrition from all players
  const nutritionChanges: PhaseTransitionResult['nutritionChanges'] = [];
  const eliminatedPlayers: Player[] = [];

  for (const player of players) {
    const oldNutrition = player.nutrition;
    const newNutrition = Math.max(0, oldNutrition - 1);
    
    await playerDb.updatePlayerNutrition(player.id, newNutrition);
    
    nutritionChanges.push({
      playerId: player.id,
      oldNutrition,
      newNutrition,
    });

    if (newNutrition === 0) {
      eliminatedPlayers.push(player);
    }
  }

  // Check for winner if players are eliminated
  const alivePlayers = players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));
  let winner: Player | undefined;

  if (alivePlayers.length === 1) {
    // Last player standing wins
    winner = alivePlayers[0];
    await gameDb.setGameWinner(gameId, winner.id);
  } else if (alivePlayers.length === 0) {
    // All players eliminated - highest score wins
    const sortedByScore = [...players].sort((a, b) => b.score - a.score);
    winner = sortedByScore[0];
    await gameDb.setGameWinner(gameId, winner.id);
  }

  // Refill paint market
  let refillDetails: { cubesAdded: number } | undefined;
  if (gameState && !winner) {
    const cubesNeeded = PAINT_MARKET_REFILL_SIZE - gameState.paint_market.length;
    if (cubesNeeded > 0 && gameState.paint_bag.length > 0) {
      const { drawn, remaining } = drawPaintCubes(gameState.paint_bag, cubesNeeded);
      
      await gameDb.updateGameState(gameId, {
        paint_market: [...gameState.paint_market, ...drawn],
        paint_bag: remaining,
      });
      
      refillDetails = { cubesAdded: drawn.length };
    }
  }

  // Increment day counter
  await gameDb.incrementDay(gameId);
  
  // Update to morning phase
  await gameDb.updateGamePhase(gameId, 'morning');

  // Reset to first player
  if (alivePlayers.length > 0) {
    const firstPlayer = alivePlayers.sort((a, b) => a.turn_order - b.turn_order)[0];
    await gameDb.updateCurrentPlayer(gameId, firstPlayer.id);
  }

  const game = await gameDb.getGame(gameId);

  return {
    newPhase: 'morning',
    newDay: game?.day_number,
    nutritionChanges,
    eliminatedPlayers: eliminatedPlayers.length > 0 ? eliminatedPlayers : undefined,
    refillDetails,
    winner,
  };
}

/**
 * Check if any player has met win conditions
 */
export async function checkWinConditions(
  gameId: string
): Promise<Player | null> {
  const players = await playerDb.getGamePlayers(gameId);
  const playerCount = players.length;
  const winCondition = WIN_CONDITIONS[playerCount as keyof typeof WIN_CONDITIONS] || WIN_CONDITIONS[4];

  for (const player of players) {
    if (player.score >= winCondition.points || player.paintings_completed >= winCondition.paintings) {
      return player;
    }
  }

  return null;
}

/**
 * Get phase display info
 */
export function getPhaseDisplayInfo(phase: Game['current_phase']): {
  icon: string;
  label: string;
  description: string;
} {
  const phaseInfo = {
    morning: {
      icon: '☀️',
      label: 'Morning',
      description: 'Work, buy canvases, or paint',
    },
    day: {
      icon: '🌤️',
      label: 'Day',
      description: 'Continue your artistic journey',
    },
    night: {
      icon: '🌙',
      label: 'Night',
      description: 'Prepare for the end of day',
    },
    selling: {
      icon: '💰',
      label: 'Selling',
      description: 'Collect paint rewards for completed paintings',
    },
  };

  return phaseInfo[phase] || phaseInfo.morning;
}
