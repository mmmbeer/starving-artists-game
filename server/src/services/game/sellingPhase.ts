// Selling Phase Service
// Handles the paint collection phase after paintings are completed

import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import * as canvasDb from '../../database/canvasDb';
import { SellingPhaseData, PaintCube, Player, PlayerCanvas } from '../../models/types';
import { SELLING_PAINT_PAYOUT } from '../../utils/constants';

interface CompletedPaintingInfo {
  playerId: string;
  canvasId: string;
  paintValue: number;
  playerName: string;
}

/**
 * Initialize the selling phase based on completed paintings
 * Players are ordered by Paint Value of their completed paintings
 */
export async function initializeSellingPhase(gameId: string): Promise<SellingPhaseData | null> {
  const players = await playerDb.getGamePlayers(gameId);
  const gameState = await gameDb.getGameState(gameId);
  
  if (!gameState) return null;

  // Gather all completed paintings from this round (not yet collected)
  const completedPaintings: CompletedPaintingInfo[] = [];
  
  for (const player of players) {
    const canvases = await canvasDb.getPlayerCanvases(player.id);
    
    // Find recently completed canvases (completed but not yet had selling phase)
    for (const canvas of canvases) {
      if (canvas.completed && canvas.definition) {
        completedPaintings.push({
          playerId: player.id,
          canvasId: canvas.id,
          paintValue: canvas.definition.paint_value,
          playerName: player.name,
        });
      }
    }
  }

  // If no completed paintings, skip selling phase
  if (completedPaintings.length === 0) {
    return null;
  }

  // Sort by paint value (highest first)
  completedPaintings.sort((a, b) => b.paintValue - a.paintValue);

  // Assign ranks and cubes per action
  const sellingOrder: SellingPhaseData['order'] = completedPaintings.map((painting, index) => {
    let rank: 'first' | 'second' | 'other';
    let cubesPerAction: number;

    if (index === 0) {
      rank = 'first';
      cubesPerAction = SELLING_PAINT_PAYOUT.FIRST; // 4 cubes
    } else if (index === 1) {
      rank = 'second';
      cubesPerAction = SELLING_PAINT_PAYOUT.SECOND; // 2 cubes
    } else {
      rank = 'other';
      cubesPerAction = SELLING_PAINT_PAYOUT.OTHER; // 1 cube
    }

    return {
      playerId: painting.playerId,
      paintValue: painting.paintValue,
      rank,
      cubesPerAction,
      remainingCubes: painting.paintValue, // Can collect up to paint value
      completedCanvasId: painting.canvasId,
    };
  });

  const sellingData: SellingPhaseData = {
    order: sellingOrder,
    currentIndex: 0,
    paintMarketAtStart: [...gameState.paint_market],
    isActive: true,
  };

  // Store selling phase data in game state
  await gameDb.updateGameState(gameId, {
    selling_phase_data: sellingData,
  });

  return sellingData;
}

/**
 * Get the current player who should collect paint
 */
export function getCurrentCollector(sellingData: SellingPhaseData): typeof sellingData.order[0] | null {
  if (!sellingData.isActive || sellingData.currentIndex >= sellingData.order.length) {
    return null;
  }
  return sellingData.order[sellingData.currentIndex];
}

/**
 * Check if a player can collect paint cubes
 */
export function canCollectPaint(
  sellingData: SellingPhaseData,
  playerId: string,
  paintMarket: PaintCube[]
): { canCollect: boolean; maxCubes: number; reason?: string } {
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

  // Check if current player is done collecting or market empty
  const shouldAdvance = 
    sellingData.order[currentIndex].remainingCubes <= 0 || 
    newPaintMarket.length === 0;

  if (shouldAdvance) {
    sellingData.currentIndex++;
    
    // Skip players who can't collect anymore
    while (
      sellingData.currentIndex < sellingData.order.length &&
      (sellingData.order[sellingData.currentIndex].remainingCubes <= 0 || newPaintMarket.length === 0)
    ) {
      sellingData.currentIndex++;
    }
  }

  // Check if selling phase is complete
  sellingData.isActive = sellingData.currentIndex < sellingData.order.length && newPaintMarket.length > 0;

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
  const currentCollector = getCurrentCollector(sellingData);

  if (!currentCollector || currentCollector.playerId !== playerId) {
    throw new Error('Not your turn to collect');
  }

  // Mark current player as done (set remaining to 0)
  sellingData.order[sellingData.currentIndex].remainingCubes = 0;
  sellingData.currentIndex++;

  // Check if selling phase is complete
  sellingData.isActive = sellingData.currentIndex < sellingData.order.length;

  await gameDb.updateGameState(gameId, {
    selling_phase_data: sellingData,
  });

  return sellingData;
}

/**
 * Check if selling phase is complete
 */
export function isSellingPhaseComplete(sellingData: SellingPhaseData | undefined): boolean {
  if (!sellingData) return true;
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
  if (!sellingData || !sellingData.isActive) {
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
      done: index < sellingData.currentIndex || entry.remainingCubes <= 0,
    };
  });

  return { isActive: true, currentCollector, order };
}
