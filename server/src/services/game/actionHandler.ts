// Game action handler - processes player actions
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { drawPaintCubes } from '../paint/paintBag';
import { refillMarketSlot, getCanvasCost, shiftMarketLeft } from '../canvas/canvasMarket';
import { canPlayerAct, advanceToNextPlayer } from './turnManager';
import { checkWinCondition, declareWinner } from '../score/scoreTracker';
import { getFullGameState } from './gameEngine';
import { checkAndProcessCompletion, validatePaintPlacement } from './canvasCompletion';
import { handleEndTurn } from './dayNightCycle';
import { collectPaintCubes, skipCollection, canCollectPaint, getCurrentCollector } from './sellingPhase';
import { FullGameState, PaintCube, PlayerCanvas } from '../../models/types';
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
): Promise<{ gameState: FullGameState; completions: Array<{ canvasId: string; rewards: any }> }> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  if (paintings.length === 0 || paintings.length > MAX_PAINT_CUBES_PER_ACTION) {
    throw new Error(`Can paint 1-${MAX_PAINT_CUBES_PER_ACTION} squares per action`);
  }
  
  // Get player's paint cubes
  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  const cubesUsed: string[] = [];
  const canvasUpdates: Map<string, PlayerCanvas> = new Map();
  const completions: Array<{ canvasId: string; rewards: any }> = [];
  
  // Group paintings by canvas
  const paintingsByCanvas = new Map<string, Array<{ squareId: string; cubeId: string }>>();
  for (const painting of paintings) {
    if (!paintingsByCanvas.has(painting.canvasId)) {
      paintingsByCanvas.set(painting.canvasId, []);
    }
    paintingsByCanvas.get(painting.canvasId)!.push({
      squareId: painting.squareId,
      cubeId: painting.cubeId,
    });
  }
  
  // Process each canvas
  for (const [canvasId, canvasPaintings] of paintingsByCanvas) {
    // Get canvas
    let canvas = canvasUpdates.get(canvasId) || await canvasDb.getPlayerCanvas(canvasId);
    if (!canvas) throw new Error('Canvas not found');
    
    if (canvas.player_id !== playerId) {
      throw new Error('Not your canvas');
    }
    
    // Process each painting on this canvas
    for (const { squareId, cubeId } of canvasPaintings) {
      // Get cube
      const cube = playerCubes.find(c => c.id === cubeId);
      if (!cube) throw new Error('Paint cube not found');
      
      if (cubesUsed.includes(cubeId)) {
        throw new Error('Cannot use same cube twice');
      }
      
      // Validate painting
      const validation = validatePaintPlacement(canvas, squareId, cube.color, cube.is_wild);
      if (!validation.valid) {
        throw new Error(validation.reason || 'Cannot paint square');
      }
      
      // Add to painted squares
      canvas = {
        ...canvas,
        painted_squares: [
          ...canvas.painted_squares,
          { squareId, cubeId, color: cube.color },
        ],
      };
      
      cubesUsed.push(cubeId);
    }
    
    // Update canvas in database
    await canvasDb.updateCanvasPaintedSquares(canvasId, canvas.painted_squares);
    canvasUpdates.set(canvasId, canvas);
    
    // Check completion
    const players = await playerDb.getGamePlayers(gameId);
    const completionResult = await checkAndProcessCompletion(playerId, canvasId, players.length);
    
    if (completionResult.isComplete && completionResult.rewardsAwarded) {
      completions.push({
        canvasId,
        rewards: completionResult.rewardsAwarded,
      });
      
      // Check if player won
      if (completionResult.isWinner) {
        await declareWinner(gameId, playerId);
      }
    }
  }
  
  // Remove used cubes from player
  await playerDb.removePaintCubes(playerId, cubesUsed);
  
  // Increment action count
  await gameDb.incrementActionCount(gameId);
  
  // Advance to next player
  await advanceToNextPlayer(gameId);
  
  return {
    gameState: await getFullGameState(gameId),
    completions,
  };
}

export async function performEndTurnAction(
  gameId: string,
  playerId: string
): Promise<{ gameState: FullGameState; phaseResult?: any }> {
  // Verify player can act
  const canAct = await canPlayerAct(gameId, playerId);
  if (!canAct) throw new Error('Not your turn');
  
  const result = await handleEndTurn(gameId, playerId);
  
  return {
    gameState: await getFullGameState(gameId),
    phaseResult: result.phaseResult,
  };
}

/**
 * Collect paint cubes during selling phase
 */
export async function performCollectPaintAction(
  gameId: string,
  playerId: string,
  selectedCubeIds: string[]
): Promise<{ gameState: FullGameState; cubesCollected: PaintCube[]; sellingComplete: boolean }> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.current_phase !== 'selling') {
    throw new Error('Not in selling phase');
  }
  
  const result = await collectPaintCubes(gameId, playerId, selectedCubeIds);
  
  // Check if selling phase is complete
  const sellingComplete = !result.sellingData.isActive;
  
  if (sellingComplete) {
    // Advance to next day
    const { handleEndTurn: advanceFromSelling } = await import('./dayNightCycle');
    // We need to trigger phase advancement
    const gameState = await gameDb.getGameState(gameId);
    if (gameState) {
      await gameDb.updateGameState(gameId, {
        selling_phase_data: undefined,
      });
    }
  }
  
  return {
    gameState: await getFullGameState(gameId),
    cubesCollected: result.cubesCollected,
    sellingComplete,
  };
}

/**
 * Skip collecting paint during selling phase
 */
export async function performSkipCollectionAction(
  gameId: string,
  playerId: string
): Promise<{ gameState: FullGameState; sellingComplete: boolean }> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.current_phase !== 'selling') {
    throw new Error('Not in selling phase');
  }
  
  const sellingData = await skipCollection(gameId, playerId);
  const sellingComplete = !sellingData.isActive;
  
  return {
    gameState: await getFullGameState(gameId),
    sellingComplete,
  };
}

/**
 * Get current action availability for a player
 */
export async function getAvailableActions(
  gameId: string,
  playerId: string
): Promise<{
  canAct: boolean;
  availableActions: string[];
  reason?: string;
}> {
  const game = await gameDb.getGame(gameId);
  if (!game) {
    return { canAct: false, availableActions: [], reason: 'Game not found' };
  }
  
  if (game.status !== 'playing') {
    return { canAct: false, availableActions: [], reason: 'Game not active' };
  }
  
  // During selling phase
  if (game.current_phase === 'selling') {
    const gameState = await gameDb.getGameState(gameId);
    if (gameState?.selling_phase_data) {
      const collector = getCurrentCollector(gameState.selling_phase_data);
      if (collector && collector.playerId === playerId) {
        return {
          canAct: true,
          availableActions: ['collect_paint', 'skip_collection'],
        };
      }
    }
    return { canAct: false, availableActions: [], reason: 'Not your turn to collect' };
  }
  
  // Regular phases
  if (game.current_player_id !== playerId) {
    return { canAct: false, availableActions: [], reason: 'Not your turn' };
  }
  
  const gameState = await gameDb.getGameState(gameId);
  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  const playerCanvases = await canvasDb.getPlayerCanvases(playerId);
  
  const actions: string[] = ['end_turn'];
  
  // Work: always available if bag not empty
  if (gameState && gameState.paint_bag.length > 0) {
    actions.push('work');
  }
  
  // Buy canvas: if player has enough cubes
  if (gameState && playerCubes.length >= 1) {
    actions.push('buy_canvas');
  }
  
  // Paint: if player has cubes and incomplete canvases
  if (playerCubes.length > 0 && playerCanvases.some(c => !c.completed)) {
    actions.push('paint');
  }
  
  return { canAct: true, availableActions: actions };
}
