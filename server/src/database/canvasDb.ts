// Canvas database operations - using in-memory store
import { memoryDb } from './memoryDb';
import { CanvasDefinition, PlayerCanvas } from '../models/types';

export async function getAllCanvasDefinitions(): Promise<CanvasDefinition[]> {
  return memoryDb.getCanvasDefinitions();
}

export async function getCanvasDefinition(
  canvasId: number
): Promise<CanvasDefinition | null> {
  return memoryDb.getCanvasDefinition(canvasId);
}

export async function getCanvasDefinitions(
  canvasIds: number[]
): Promise<CanvasDefinition[]> {
  return canvasIds
    .map(id => memoryDb.getCanvasDefinition(id))
    .filter((c): c is CanvasDefinition => c !== null);
}

// Player canvas operations
export async function addPlayerCanvas(
  playerId: string,
  gameId: string,
  canvasDefinitionId: number
): Promise<PlayerCanvas> {
  const canvas = memoryDb.addPlayerCanvas(playerId, gameId, canvasDefinitionId);
  return {
    ...canvas,
    definition: memoryDb.getCanvasDefinition(canvasDefinitionId) || undefined,
  } as PlayerCanvas;
}

export async function getPlayerCanvas(
  canvasId: string
): Promise<PlayerCanvas | null> {
  return memoryDb.getPlayerCanvas(canvasId);
}

export async function getPlayerCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  return memoryDb.getPlayerCanvases(playerId);
}

export async function updateCanvasPaintedSquares(
  canvasId: string,
  paintedSquares: Array<{ squareId: string; cubeId: string; color: string }>
): Promise<void> {
  memoryDb.updateCanvasPaintedSquares(canvasId, paintedSquares);
}

export async function markCanvasCompleted(canvasId: string): Promise<void> {
  memoryDb.markCanvasCompleted(canvasId);
}

export async function deletePlayerCanvas(canvasId: string): Promise<void> {
  console.log('Delete player canvas:', canvasId);
}

export async function getCompletedCanvases(
  playerId: string
): Promise<PlayerCanvas[]> {
  const canvases = memoryDb.getPlayerCanvases(playerId);
  return canvases.filter(c => c.completed);
}
