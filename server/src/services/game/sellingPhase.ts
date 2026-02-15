// Selling Phase Service
// Handles night sell selection and selling phase paint collection.

import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { drawPaintCubes } from '../paint/paintBag';
import { SellingPhaseData, PaintCube, Player } from '../../models/types';
import { SELLING_PAINT_PAYOUT } from '../../utils/constants';

const MAX_NUTRITION = 5;

interface SoldPaintingInfo {
  playerId: string;
  canvasId: string;
  paintValue: number;
  turnOrder: number;
  sequence: number;
}

function createInitialNightData(playerOrder: string[]): SellingPhaseData {
  return {
    stage: 'night_selection',
    nightOrder: [...playerOrder],
    nightCurrentIndex: 0,
    sellSelections: {},
    order: [],
    currentIndex: 0,
    paintMarketAtStart: [],
    isActive: false,
  };
}

export async function ensureNightSellingData(gameId: string): Promise<SellingPhaseData> {
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');

  if (gameState.selling_phase_data?.stage === 'night_selection') {
    return gameState.selling_phase_data;
  }

  const players = await playerDb.getGamePlayers(gameId);
  const nightData = createInitialNightData(players.map(p => p.id));
  await gameDb.updateGameState(gameId, {
    selling_phase_data: nightData,
  });

  return nightData;
}

async function resolveNightSales(
  gameId: string,
  sellingData: SellingPhaseData
): Promise<{ sellingData: SellingPhaseData | null; hasCollection: boolean }> {
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState) throw new Error('Game state not found');

  const players = await playerDb.getGamePlayers(gameId);
  const playerById = new Map(players.map(player => [player.id, player]));

  let workingBag = [...gameState.paint_bag];
  const soldPaintings: SoldPaintingInfo[] = [];

  for (const playerId of sellingData.nightOrder || []) {
    const selectedCanvasIds = sellingData.sellSelections?.[playerId] || [];
    if (selectedCanvasIds.length === 0) continue;

    const player = playerById.get(playerId);
    if (!player) continue;

    const playerCanvases = await canvasDb.getPlayerCanvases(playerId);
    const completedById = new Map(
      playerCanvases
        .filter(canvas => canvas.completed && canvas.definition)
        .map(canvas => [canvas.id, canvas])
    );

    for (let sequence = 0; sequence < selectedCanvasIds.length; sequence++) {
      const canvasId = selectedCanvasIds[sequence];
      const canvas = completedById.get(canvasId);
      if (!canvas || !canvas.definition) continue;

      const currentPlayer = await playerDb.getPlayer(playerId);
      if (!currentPlayer) continue;

      const nutritionAfterFood = currentPlayer.nutrition + canvas.definition.food_value;
      const newNutrition = Math.min(MAX_NUTRITION, nutritionAfterFood);
      const overflow = Math.max(0, nutritionAfterFood - MAX_NUTRITION);

      await playerDb.updatePlayerNutrition(playerId, newNutrition);
      await playerDb.addFoodEarned(playerId, canvas.definition.food_value);
      await playerDb.updatePlayerScore(playerId, currentPlayer.score + canvas.definition.star_value);
      await playerDb.incrementPaintingsCompleted(playerId);

      if (overflow > 0 && workingBag.length > 0) {
        const { drawn, remaining } = drawPaintCubes(workingBag, overflow);
        if (drawn.length > 0) {
          await playerDb.addPaintCubes(playerId, gameId, drawn);
        }
        workingBag = remaining;
      }

      const returnedCubes: PaintCube[] = canvas.painted_squares.map(square => ({
        id: square.cubeId,
        color: square.color,
        is_wild: square.color === 'wild',
      }));
      workingBag = [...workingBag, ...returnedCubes];

      await canvasDb.deletePlayerCanvas(canvas.id);

      soldPaintings.push({
        playerId,
        canvasId: canvas.id,
        paintValue: canvas.definition.paint_value,
        turnOrder: player.turn_order,
        sequence,
      });
    }
  }

  soldPaintings.sort((a, b) => {
    if (a.paintValue !== b.paintValue) return b.paintValue - a.paintValue;
    if (a.turnOrder !== b.turnOrder) return a.turnOrder - b.turnOrder;
    return a.sequence - b.sequence;
  });

  const collectionOrder: SellingPhaseData['order'] = soldPaintings.map((painting, index) => {
    let rank: 'first' | 'second' | 'other';
    let cubesPerAction: number;

    if (index === 0) {
      rank = 'first';
      cubesPerAction = SELLING_PAINT_PAYOUT.FIRST;
    } else if (index === 1) {
      rank = 'second';
      cubesPerAction = SELLING_PAINT_PAYOUT.SECOND;
    } else {
      rank = 'other';
      cubesPerAction = SELLING_PAINT_PAYOUT.OTHER;
    }

    return {
      playerId: painting.playerId,
      paintValue: painting.paintValue,
      rank,
      cubesPerAction,
      remainingCubes: painting.paintValue,
      completedCanvasId: painting.canvasId,
    };
  });

  if (collectionOrder.length === 0 || gameState.paint_market.length === 0) {
    await gameDb.updateGameState(gameId, {
      paint_bag: workingBag,
      selling_phase_data: undefined,
    });
    return {
      sellingData: null,
      hasCollection: false,
    };
  }

  const nextSellingData: SellingPhaseData = {
    stage: 'paint_collection',
    nightOrder: sellingData.nightOrder,
    nightCurrentIndex: sellingData.nightCurrentIndex,
    sellSelections: sellingData.sellSelections,
    order: collectionOrder,
    currentIndex: 0,
    paintMarketAtStart: [...gameState.paint_market],
    isActive: true,
  };

  await gameDb.updateGameState(gameId, {
    paint_bag: workingBag,
    selling_phase_data: nextSellingData,
  });

  return {
    sellingData: nextSellingData,
    hasCollection: true,
  };
}

export async function submitNightSellSelection(
  gameId: string,
  playerId: string,
  canvasIds: string[]
): Promise<{ phase: 'night' | 'selling' | 'morning'; nextPlayerId?: string }> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.current_phase !== 'night') {
    throw new Error('Not in night phase');
  }

  const sellingData = await ensureNightSellingData(gameId);
  const expectedPlayerId = sellingData.nightOrder?.[sellingData.nightCurrentIndex || 0];
  if (!expectedPlayerId || expectedPlayerId !== playerId) {
    throw new Error('Not your turn to submit sell selection');
  }

  const uniqueCanvasIds = [...new Set(canvasIds)];
  const playerCanvases = await canvasDb.getPlayerCanvases(playerId);
  const completedIds = new Set(
    playerCanvases.filter(canvas => canvas.completed).map(canvas => canvas.id)
  );

  for (const canvasId of uniqueCanvasIds) {
    if (!completedIds.has(canvasId)) {
      throw new Error('Sell selection includes invalid or incomplete canvas');
    }
  }

  const nextNightIndex = (sellingData.nightCurrentIndex || 0) + 1;
  const updatedNightData: SellingPhaseData = {
    ...sellingData,
    stage: 'night_selection',
    sellSelections: {
      ...(sellingData.sellSelections || {}),
      [playerId]: uniqueCanvasIds,
    },
    nightCurrentIndex: nextNightIndex,
  };

  const nightOrder = updatedNightData.nightOrder || [];
  if (nextNightIndex < nightOrder.length) {
    const nextPlayerId = nightOrder[nextNightIndex];
    await gameDb.updateGameState(gameId, {
      selling_phase_data: updatedNightData,
    });
    await gameDb.updateCurrentPlayer(gameId, nextPlayerId);
    return { phase: 'night', nextPlayerId };
  }

  const resolved = await resolveNightSales(gameId, updatedNightData);

  if (!resolved.hasCollection || !resolved.sellingData) {
    return { phase: 'morning' };
  }

  await gameDb.updateGamePhase(gameId, 'selling');
  await gameDb.updateCurrentPlayer(gameId, resolved.sellingData.order[0].playerId);

  return {
    phase: 'selling',
    nextPlayerId: resolved.sellingData.order[0].playerId,
  };
}

/**
 * Get the current player who should collect paint
 */
export function getCurrentCollector(sellingData: SellingPhaseData): typeof sellingData.order[0] | null {
  if (sellingData.stage !== 'paint_collection') {
    return null;
  }
  if (!sellingData.isActive || sellingData.currentIndex >= sellingData.order.length) {
    return null;
  }
  return sellingData.order[sellingData.currentIndex];
}

function getNextCollectorIndex(sellingData: SellingPhaseData, startIndex: number): number {
  if (sellingData.order.length === 0) return -1;

  for (let offset = 0; offset < sellingData.order.length; offset++) {
    const index = (startIndex + offset) % sellingData.order.length;
    if (sellingData.order[index].remainingCubes > 0) {
      return index;
    }
  }

  return -1;
}

/**
 * Check if a player can collect paint cubes
 */
export function canCollectPaint(
  sellingData: SellingPhaseData,
  playerId: string,
  paintMarket: PaintCube[]
): { canCollect: boolean; maxCubes: number; reason?: string } {
  if (sellingData.stage !== 'paint_collection') {
    return { canCollect: false, maxCubes: 0, reason: 'Paint collection is not active' };
  }
  if (!sellingData.isActive) {
    return { canCollect: false, maxCubes: 0, reason: 'Selling phase is not active' };
  }

  const currentCollector = getCurrentCollector(sellingData);
  if (!currentCollector) {
    return { canCollect: false, maxCubes: 0, reason: 'No current collector' };
  }

  if (currentCollector.playerId !== playerId) {
    return { canCollect: false, maxCubes: 0, reason: 'Not your turn to collect' };
  }

  if (paintMarket.length === 0) {
    return { canCollect: false, maxCubes: 0, reason: 'Paint market is empty' };
  }

  if (currentCollector.remainingCubes <= 0) {
    return { canCollect: false, maxCubes: 0, reason: 'No more cubes to collect' };
  }

  // Can collect up to cubesPerAction or remaining, whichever is smaller
  const maxCubes = Math.min(
    currentCollector.cubesPerAction,
    currentCollector.remainingCubes,
    paintMarket.length
  );

  return { canCollect: true, maxCubes };
}

/**
 * Player collects paint cubes from the market during selling phase
 */
export async function collectPaintCubes(
  gameId: string,
  playerId: string,
  selectedCubeIds: string[]
): Promise<{ success: boolean; sellingData: SellingPhaseData; cubesCollected: PaintCube[] }> {
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState || !gameState.selling_phase_data) {
    throw new Error('Selling phase not active');
  }

  const sellingData = gameState.selling_phase_data;
  if (sellingData.stage !== 'paint_collection') {
    throw new Error('Paint collection not active');
  }
  const canCollect = canCollectPaint(sellingData, playerId, gameState.paint_market);

  if (!canCollect.canCollect) {
    throw new Error(canCollect.reason || 'Cannot collect paint');
  }

  // Validate selected cubes exist in market
  const selectedCubes: PaintCube[] = [];
  for (const cubeId of selectedCubeIds) {
    const cube = gameState.paint_market.find(c => c.id === cubeId);
    if (!cube) {
      throw new Error(`Cube ${cubeId} not found in paint market`);
    }
    selectedCubes.push(cube);
  }

  // Validate not taking more than allowed
  if (selectedCubes.length === 0) {
    throw new Error('Must select at least one cube');
  }
  if (selectedCubes.length > canCollect.maxCubes) {
    throw new Error(`Can only collect ${canCollect.maxCubes} cubes`);
  }

  // Add cubes to player's inventory
  await playerDb.addPaintCubes(playerId, gameId, selectedCubes);

  // Remove cubes from market
  const newPaintMarket = gameState.paint_market.filter(
    c => !selectedCubeIds.includes(c.id)
  );

  // Update selling data
  const currentIndex = sellingData.currentIndex;
  sellingData.order[currentIndex].remainingCubes -= selectedCubes.length;

  if (newPaintMarket.length === 0) {
    sellingData.isActive = false;
  } else {
    const nextIndex = getNextCollectorIndex(sellingData, currentIndex + 1);
    sellingData.isActive = nextIndex >= 0;
    if (nextIndex >= 0) {
      sellingData.currentIndex = nextIndex;
      await gameDb.updateCurrentPlayer(gameId, sellingData.order[nextIndex].playerId);
    }
  }

  // Update game state
  await gameDb.updateGameState(gameId, {
    paint_market: newPaintMarket,
    selling_phase_data: sellingData,
  });

  return {
    success: true,
    sellingData,
    cubesCollected: selectedCubes,
  };
}

/**
 * Skip collecting (pass turn)
 */
export async function skipCollection(
  gameId: string,
  playerId: string
): Promise<SellingPhaseData> {
  const gameState = await gameDb.getGameState(gameId);
  if (!gameState || !gameState.selling_phase_data) {
    throw new Error('Selling phase not active');
  }

  const sellingData = gameState.selling_phase_data;
  if (sellingData.stage !== 'paint_collection') {
    throw new Error('Paint collection not active');
  }
  const currentCollector = getCurrentCollector(sellingData);

  if (!currentCollector || currentCollector.playerId !== playerId) {
    throw new Error('Not your turn to collect');
  }

  // Pass forfeits all remaining collection for this sold canvas.
  const currentIndex = sellingData.currentIndex;
  sellingData.order[currentIndex].remainingCubes = 0;

  const nextIndex = getNextCollectorIndex(sellingData, currentIndex + 1);
  sellingData.isActive = nextIndex >= 0;
  if (nextIndex >= 0) {
    sellingData.currentIndex = nextIndex;
    await gameDb.updateCurrentPlayer(gameId, sellingData.order[nextIndex].playerId);
  }

  await gameDb.updateGameState(gameId, {
    selling_phase_data: sellingData,
  });

  return sellingData;
}

/**
 * Check if selling phase is complete
 */
export function isSellingPhaseComplete(sellingData: SellingPhaseData | undefined): boolean {
  if (!sellingData || sellingData.stage !== 'paint_collection') return true;
  return !sellingData.isActive;
}

/**
 * Get selling phase status for UI
 */
export function getSellingPhaseStatus(
  sellingData: SellingPhaseData | undefined,
  players: Player[]
): {
  isActive: boolean;
  currentCollector: { playerId: string; playerName: string; cubesPerAction: number; remainingCubes: number } | null;
  order: Array<{ playerId: string; playerName: string; rank: string; done: boolean }>;
} {
  if (!sellingData || sellingData.stage !== 'paint_collection' || !sellingData.isActive) {
    return { isActive: false, currentCollector: null, order: [] };
  }

  const currentEntry = getCurrentCollector(sellingData);
  let currentCollector = null;

  if (currentEntry) {
    const player = players.find(p => p.id === currentEntry.playerId);
    currentCollector = {
      playerId: currentEntry.playerId,
      playerName: player?.name || 'Unknown',
      cubesPerAction: currentEntry.cubesPerAction,
      remainingCubes: currentEntry.remainingCubes,
    };
  }

  const order = sellingData.order.map((entry, index) => {
    const player = players.find(p => p.id === entry.playerId);
    return {
      playerId: entry.playerId,
      playerName: player?.name || 'Unknown',
      rank: entry.rank,
      done: entry.remainingCubes <= 0,
    };
  });

  return { isActive: true, currentCollector, order };
}
