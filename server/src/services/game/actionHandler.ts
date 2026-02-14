// Game action handler - processes player actions
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { drawPaintCubes, validateTradeRatio } from '../paint/paintBag';
import { refillMarketSlot, getCanvasCost, shiftMarketLeft, resetMarket } from '../canvas/canvasMarket';
import { canPlayerAct, canPlayerEndTurn } from './turnManager';
import { checkWinCondition, declareWinner } from '../score/scoreTracker';
import { getFullGameState } from './gameEngine';
import { checkAndProcessCompletion, validatePaintPlacement } from './canvasCompletion';
import { collectPaintCubes, skipCollection, canCollectPaint, getCurrentCollector } from './sellingPhase';
import { FullGameState, PaintCube, PlayerCanvas } from '../../models/types';
import { CUBES_PER_WORK_ACTION, MAX_ACTIONS_PER_TURN, MAX_PAINT_CUBES_PER_ACTION } from '../../utils/constants';

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
  
  return getFullGameState(gameId);
}

export async function performBuyCanvasAction(
  gameId: string,
  playerId: string,
  slotIndex: number,
  cubeIds: string[]
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
  
  const cost = getCanvasCost(slotIndex);
  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  
  if (!Array.isArray(cubeIds) || cubeIds.length !== cost) {
    throw new Error(`Must select exactly ${cost} paint cube(s) to buy this canvas`);
  }

  if (playerCubes.length < cost) {
    throw new Error(`Need ${cost} paint cubes to buy this canvas`);
  }
  
  const uniqueCubeIds = new Set(cubeIds);
  if (uniqueCubeIds.size !== cubeIds.length) {
    throw new Error('Cannot use the same cube more than once');
  }

  const cubesById = new Map(playerCubes.map(cube => [cube.id, cube]));
  const cubesToRemove: PaintCube[] = [];
  for (const cubeId of cubeIds) {
    const cube = cubesById.get(cubeId);
    if (!cube) {
      throw new Error('Selected cube not found in your studio');
    }
    cubesToRemove.push(cube);
  }

  // Remove selected paint cubes from player
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

  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');
  
  // Increment action count
  await gameDb.incrementActionCount(gameId);
  
  return {
    gameState: await getFullGameState(gameId),
    completions,
  };
}

async function assertFreeActionAvailable(gameId: string, playerId: string): Promise<void> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.status !== 'playing') {
    throw new Error('Game not active');
  }

  if (game.current_phase === 'selling') {
    throw new Error('Free actions are not available during selling');
  }

  if (game.current_player_id !== playerId) {
    throw new Error('Not your turn');
  }

  const player = await playerDb.getPlayer(playerId);
  if (!player) throw new Error('Player not found');

  if (player.last_free_action_day >= game.day_number) {
    throw new Error('Free action already used today');
  }
}

export async function performTradeForPaintAction(
  gameId: string,
  playerId: string,
  tradedCubeIds: string[],
  marketCubeIds: string[]
): Promise<FullGameState> {
  await assertFreeActionAvailable(gameId, playerId);

  if (!Array.isArray(tradedCubeIds) || !Array.isArray(marketCubeIds)) {
    throw new Error('Invalid trade selection');
  }

  if (!validateTradeRatio(tradedCubeIds.length, marketCubeIds.length)) {
    throw new Error('Invalid trade ratio');
  }

  const tradedUnique = new Set(tradedCubeIds);
  if (tradedUnique.size !== tradedCubeIds.length) {
    throw new Error('Cannot trade the same cube more than once');
  }

  const marketUnique = new Set(marketCubeIds);
  if (marketUnique.size !== marketCubeIds.length) {
    throw new Error('Cannot take the same market cube more than once');
  }

  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  const cubesById = new Map(playerCubes.map(cube => [cube.id, cube]));
  const cubesToTrade: PaintCube[] = [];
  for (const cubeId of tradedCubeIds) {
    const cube = cubesById.get(cubeId);
    if (!cube) {
      throw new Error('Selected trade cube not found in your studio');
    }
    cubesToTrade.push(cube);
  }

  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');

  const marketById = new Map(gameState.paint_market.map(cube => [cube.id, cube]));
  const cubesToReceive: PaintCube[] = [];
  for (const cubeId of marketCubeIds) {
    const cube = marketById.get(cubeId);
    if (!cube) {
      throw new Error('Selected market cube not found');
    }
    if (cube.is_wild || cube.color === 'wild') {
      throw new Error('Cannot take wild cubes from the paint market');
    }
    cubesToReceive.push(cube);
  }

  await playerDb.removePaintCubes(
    playerId,
    cubesToTrade.map(c => c.id)
  );

  await playerDb.addPaintCubes(playerId, gameId, cubesToReceive);

  const updatedMarket = [
    ...gameState.paint_market.filter(cube => !marketCubeIds.includes(cube.id)),
    ...cubesToTrade,
  ];

  await gameDb.updateGameState(gameId, {
    paint_market: updatedMarket,
  });

  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');

  await playerDb.updatePlayerFreeActionDay(playerId, game.day_number);

  return getFullGameState(gameId);
}

export async function performResetCanvasMarketAction(
  gameId: string,
  playerId: string,
  cubeIds: string[]
): Promise<FullGameState> {
  await assertFreeActionAvailable(gameId, playerId);

  if (!Array.isArray(cubeIds) || cubeIds.length !== 2) {
    throw new Error('Must select exactly 2 paint cubes to reset the market');
  }

  const uniqueCubeIds = new Set(cubeIds);
  if (uniqueCubeIds.size !== cubeIds.length) {
    throw new Error('Cannot use the same cube more than once');
  }

  const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
  const cubesById = new Map(playerCubes.map(cube => [cube.id, cube]));
  const cubesToPay: PaintCube[] = [];
  for (const cubeId of cubeIds) {
    const cube = cubesById.get(cubeId);
    if (!cube) {
      throw new Error('Selected cube not found in your studio');
    }
    cubesToPay.push(cube);
  }

  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');

  await playerDb.removePaintCubes(
    playerId,
    cubesToPay.map(c => c.id)
  );

  const updatedMarket = [...gameState.paint_market, ...cubesToPay];
  const { market: newCanvasMarket, remaining: deckRemaining } = await resetMarket(
    gameState.canvas_deck
  );

  await gameDb.updateGameState(gameId, {
    paint_market: updatedMarket,
    canvas_market: newCanvasMarket,
    canvas_deck: deckRemaining,
  });

  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');

  await playerDb.updatePlayerFreeActionDay(playerId, game.day_number);

  return getFullGameState(gameId);
}

export async function performEndTurnAction(
  gameId: string,
  playerId: string
): Promise<{ gameState: FullGameState; phaseResult?: any }> {
  // Verify player can act
  const canAct = await canPlayerEndTurn(gameId, playerId);
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
  const player = await playerDb.getPlayer(playerId);
  const actionsTaken = gameState?.actions_taken ?? 0;

  const actions: string[] = ['end_turn'];
  const freeActionAvailable = player ? player.last_free_action_day < game.day_number : false;

  if (freeActionAvailable) {
    actions.push('trade_paint');
    actions.push('reset_canvas_market');
  }

  if (actionsTaken >= MAX_ACTIONS_PER_TURN) {
    return { canAct: true, availableActions: actions, reason: 'No actions remaining' };
  }
  
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
