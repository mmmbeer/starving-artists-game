// Selling phase - round robin canvas selling
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { Player, PlayerCanvas, FullGameState } from '../../models/types';
import { updatePlayerScore } from '../score/scoreTracker';
import { getFullGameState } from './gameEngine';
import { SELLING_PAINT_PAYOUT } from '../../utils/constants';

interface SellIntent {
  playerId: string;
  canvasIds: string[];
}

interface SellingResult {
  playerId: string;
  canvasId: string;
  starValue: number;
  foodValue: number;
  paintValue: number;
  paintReceived: number;
}

export async function collectSellIntents(
  gameId: string,
  intents: SellIntent[]
): Promise<SellingResult[]> {
  const players = await playerDb.getGamePlayers(gameId);
  const results: SellingResult[] = [];
  
  // Process in turn order
  const sortedPlayers = [...players].sort((a, b) => a.turn_order - b.turn_order);
  
  for (const player of sortedPlayers) {
    const intent = intents.find(i => i.playerId === player.id);
    if (!intent || intent.canvasIds.length === 0) continue;
    
    // Process each canvas the player wants to sell
    for (const canvasId of intent.canvasIds) {
      const result = await sellCanvas(gameId, player.id, canvasId);
      if (result) {
        results.push(result);
      }
    }
  }
  
  return results;
}

export async function sellCanvas(
  gameId: string,
  playerId: string,
  canvasId: string
): Promise<SellingResult | null> {
  const canvas = await canvasDb.getPlayerCanvas(canvasId);
  
  if (!canvas || !canvas.completed || canvas.player_id !== playerId) {
    return null;
  }
  
  if (!canvas.definition) {
    return null;
  }
  
  const { star_value, food_value, paint_value } = canvas.definition;
  
  // Add nutrition
  const player = await playerDb.getPlayer(playerId);
  if (!player) return null;
  
  let newNutrition = player.nutrition + food_value;
  let excessFood = 0;
  
  // If nutrition exceeds 5, gain 4 paint cubes per excess food
  if (newNutrition > 5) {
    excessFood = newNutrition - 5;
    newNutrition = 5;
  }
  
  await playerDb.updatePlayerNutrition(playerId, newNutrition);
  await playerDb.addFoodEarned(playerId, food_value);
  
  // Award paint cubes from market based on paint value
  const paintReceived = await awardPaintCubes(gameId, playerId, paint_value);
  
  // Add extra cubes for excess food
  if (excessFood > 0) {
    const bonusCubes = excessFood * 4;
    await awardPaintCubes(gameId, playerId, bonusCubes);
  }
  
  // Award star points
  await updatePlayerScore(playerId, star_value);
  
  // Return painted cubes to bag
  const gameState = await gameDb.getGameState(gameId);
  if (gameState) {
    // Get the cubes that were used on this canvas
    const cubeIds = canvas.painted_squares.map(ps => ps.cubeId);
    
    // We need to recreate the cubes (they're not stored anymore)
    // In a real implementation, we'd track these properly
    // For now, just delete the canvas
  }
  
  // Delete the canvas
  await canvasDb.deletePlayerCanvas(canvasId);
  
  return {
    playerId,
    canvasId,
    starValue: star_value,
    foodValue: food_value,
    paintValue: paint_value,
    paintReceived,
  };
}

async function awardPaintCubes(
  gameId: string,
  playerId: string,
  paintValue: number
): Promise<number> {
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) return 0;
  
  // Determine how many cubes to award based on paint value rank
  // This is simplified - real game has complex payout rules
  let cubesToAward = 0;
  
  if (paintValue >= 4) {
    cubesToAward = SELLING_PAINT_PAYOUT.FIRST; // 4 cubes
  } else if (paintValue >= 2) {
    cubesToAward = SELLING_PAINT_PAYOUT.SECOND; // 2 cubes
  } else {
    cubesToAward = SELLING_PAINT_PAYOUT.OTHER; // 1 cube
  }
  
  // Take cubes from paint market
  const availableCubes = gameState.paint_market.slice(0, cubesToAward);
  const remainingMarket = gameState.paint_market.slice(cubesToAward);
  
  if (availableCubes.length > 0) {
    await playerDb.addPaintCubes(playerId, gameId, availableCubes);
    await gameDb.updateGameState(gameId, {
      paint_market: remainingMarket,
    });
  }
  
  return availableCubes.length;
}

export async function completeSelling(
  gameId: string,
  intents: SellIntent[]
): Promise<FullGameState> {
  // Collect and process all sell intents
  await collectSellIntents(gameId, intents);
  
  // After selling, check for starvation
  const players = await playerDb.getGamePlayers(gameId);
  const starvedPlayers = players.filter(p => p.nutrition < 1);
  
  if (starvedPlayers.length > 0) {
    // Game ends due to starvation
    // Winner is player with highest score
    const sortedPlayers = [...players].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.paintings_completed !== b.paintings_completed) {
        return b.paintings_completed - a.paintings_completed;
      }
      return b.food_earned - a.food_earned;
    });
    
    const winner = sortedPlayers[0];
    await gameDb.setGameWinner(gameId, winner.id);
  }
  
  return getFullGameState(gameId);
}
