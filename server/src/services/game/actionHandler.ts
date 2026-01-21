// Game action handler - processes player actions
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { drawPaintCubes } from '../paint/paintBag';
import { refillMarketSlot, getCanvasCost, shiftMarketLeft } from '../canvas/canvasMarket';
import { canPaintSquare, paintSquare, isCanvasComplete } from '../canvas/canvasManager';
import { canPlayerAct, advanceToNextPlayer, advancePhase } from './turnManager';
import { checkWinCondition, updatePlayerScore, declareWinner } from '../score/scoreTracker';
import { getFullGameState } from './gameEngine';
import { FullGameState, PaintCube } from '../../models/types';
import { CUBES_PER_WORK_ACTION, MAX_PAINT_CUBES_PER_ACTION } from '../../utils/constants';

export async function performWorkAction(
  gameId: string,
  playerId: string
): Promise<FullGameState> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  // Get game state
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');
  
  // Draw cubes from bag
  const { drawn, remaining } = drawPaintCubes(
    gameState.paint_bag,
    CUBES_PER_WORK_ACTION
  );
  
  if (drawn.length === 0) {
    throw new Error('Paint bag is empty');
  }
  
  // Add cubes to player's studio
  await playerDb.addPaintCubes(playerId, gameId, drawn);
  
  // Update game state
  await gameDb.updateGameState(gameId, {
    paint_bag: remaining,
  });
  
  // Increment action count
  await gameDb.incrementActionCount(gameId);
  
  // Advance to next player
  await advanceToNextPlayer(gameId);
  
  return getFullGameState(gameId);
}

export async function performBuyCanvasAction(
  gameId: string,
  playerId: string,
  slotIndex: number
): Promise<FullGameState> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  if (slotIndex < 0 || slotIndex > 2) {
    throw new Error('Invalid canvas slot');
  }
  
  // Get game state
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');
  
  const canvas = gameState.canvas_market[slotIndex];
  if (!canvas) throw new Error('No canvas in that slot');
  
  // Check player has enough paint cubes
  const cost = getCanvasCost(slotIndex);
  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  
  if (playerCubes.length < cost) {
    throw new Error(`Need ${cost} paint cubes to buy this canvas`);
  }
  
  // Remove paint cubes from player (any color)
  const cubesToRemove = playerCubes.slice(0, cost);
  await playerDb.removePaintCubes(
    playerId,
    cubesToRemove.map(c => c.id)
  );
  
  // Add cubes to paint market
  const updatedMarket = [...gameState.paint_market, ...cubesToRemove];
  
  // Add canvas to player
  await canvasDb.addPlayerCanvas(playerId, gameId, canvas.id);
  
  // Remove canvas from market and shift remaining
  const newCanvasMarket = [...gameState.canvas_market];
  newCanvasMarket[slotIndex] = null;
  const shiftedMarket = shiftMarketLeft(newCanvasMarket);
  
  // Refill from deck
  const { market: refilledMarket, remaining: deckRemaining } = await refillMarketSlot(
    shiftedMarket,
    shiftedMarket.findIndex(c => c === null),
    gameState.canvas_deck
  );
  
  // Update game state
  await gameDb.updateGameState(gameId, {
    paint_market: updatedMarket,
    canvas_market: refilledMarket,
    canvas_deck: deckRemaining,
  });
  
  // Increment action count
  await gameDb.incrementActionCount(gameId);
  
  // Advance to next player
  await advanceToNextPlayer(gameId);
  
  return getFullGameState(gameId);
}

export async function performPaintAction(
  gameId: string,
  playerId: string,
  paintings: Array<{ canvasId: string; squareId: string; cubeId: string }>
): Promise<FullGameState> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  if (paintings.length === 0 || paintings.length > MAX_PAINT_CUBES_PER_ACTION) {
    throw new Error(`Can paint 1-${MAX_PAINT_CUBES_PER_ACTION} squares per action`);
  }
  
  // Get player's paint cubes
  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  const cubesUsed: string[] = [];
  
  // Process each painting
  for (const { canvasId, squareId, cubeId } of paintings) {
    // Get canvas
    const canvas = await canvasDb.getPlayerCanvas(canvasId);
    if (!canvas) throw new Error('Canvas not found');
    
    if (canvas.player_id !== playerId) {
      throw new Error('Not your canvas');
    }
    
    // Get cube
    const cube = playerCubes.find(c => c.id === cubeId);
    if (!cube) throw new Error('Paint cube not found');
    
    if (cubesUsed.includes(cubeId)) {
      throw new Error('Cannot use same cube twice');
    }
    
    // Validate painting
    const validation = canPaintSquare(canvas, squareId, cube);
    if (!validation.valid) {
      throw new Error(validation.error || 'Cannot paint square');
    }
    
    // Paint the square
    const updatedCanvas = paintSquare(canvas, squareId, cube);
    
    // Update in database
    await canvasDb.updateCanvasPaintedSquares(
      canvasId,
      updatedCanvas.painted_squares
    );
    
    // Check if canvas is complete
    if (isCanvasComplete(updatedCanvas)) {
      await canvasDb.markCanvasCompleted(canvasId);
      await playerDb.incrementPaintingsCompleted(playerId);
    }
    
    cubesUsed.push(cubeId);
  }
  
  // Remove used cubes from player
  await playerDb.removePaintCubes(playerId, cubesUsed);
  
  // Increment action count
  await gameDb.incrementActionCount(gameId);
  
  // Advance to next player
  await advanceToNextPlayer(gameId);
  
  // Check win condition
  const winCheck = await checkWinCondition(gameId);
  if (winCheck.won && winCheck.winner) {
    await declareWinner(gameId, winCheck.winner.id);
  }
  
  return getFullGameState(gameId);
}

export async function performEndTurnAction(
  gameId: string,
  playerId: string
): Promise<FullGameState> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  const players = await playerDb.getGamePlayers(gameId);
  
  // Check if all players have acted in this phase
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');
  
  // Advance to next player
  const nextPlayer = await advanceToNextPlayer(gameId);
  
  // If we've cycled back to first player, advance phase
  if (nextPlayer.turn_order === 0) {
    await advancePhase(gameId);
  }
  
  return getFullGameState(gameId);
}
