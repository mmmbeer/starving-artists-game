// Canvas Completion Service
// Handles detecting completed canvases and awarding rewards

import * as canvasDb from '../../database/canvasDb';
import { PlayerCanvas, Player, CanvasDefinition } from '../../models/types';

export interface CompletionResult {
  isComplete: boolean;
  rewardsAwarded?: {
    stars: number;
    food: number;
    paintValue: number;
  };
  isWinner?: boolean;
}

/**
 * Check if a canvas is complete (all squares painted)
 */
export function isCanvasComplete(canvas: PlayerCanvas): boolean {
  if (!canvas.definition || !canvas.definition.layout_json) {
    return false;
  }

  const totalSquares = canvas.definition.layout_json.squares.length;
  const paintedSquares = canvas.painted_squares.length;

  return paintedSquares >= totalSquares;
}

/**
 * Check if canvas is complete and process rewards if so
 */
export async function checkAndProcessCompletion(
  playerId: string,
  canvasId: string,
  _playerCount: number
): Promise<CompletionResult> {
  const canvas = await canvasDb.getPlayerCanvas(canvasId);
  if (!canvas || canvas.player_id !== playerId) {
    return { isComplete: false };
  }

  // Already completed
  if (canvas.completed) {
    return { isComplete: true };
  }

  // Check if all squares are painted
  if (!isCanvasComplete(canvas)) {
    return { isComplete: false };
  }

  // Mark canvas as completed
  await canvasDb.markCanvasCompleted(canvasId);

  return {
    isComplete: true,
    rewardsAwarded: canvas.definition ? {
      stars: canvas.definition.star_value,
      food: canvas.definition.food_value,
      paintValue: canvas.definition.paint_value,
    } : undefined,
    isWinner: false,
  };
}

/**
 * Get progress of a canvas
 */
export function getCanvasProgress(canvas: PlayerCanvas): {
  painted: number;
  total: number;
  percentage: number;
} {
  if (!canvas.definition || !canvas.definition.layout_json) {
    return { painted: 0, total: 0, percentage: 0 };
  }

  const total = canvas.definition.layout_json.squares.length;
  const painted = canvas.painted_squares.length;
  const percentage = total > 0 ? Math.round((painted / total) * 100) : 0;

  return { painted, total, percentage };
}

/**
 * Validate a paint placement
 */
export function validatePaintPlacement(
  canvas: PlayerCanvas,
  squareId: string,
  color: string,
  isWild: boolean
): { valid: boolean; reason?: string } {
  if (!canvas.definition || !canvas.definition.layout_json) {
    return { valid: false, reason: 'Canvas definition not found' };
  }

  // Check if square exists
  const square = canvas.definition.layout_json.squares.find(s => s.id === squareId);
  if (!square) {
    return { valid: false, reason: 'Square not found on canvas' };
  }

  // Check if square is already painted
  const alreadyPainted = canvas.painted_squares.some(ps => ps.squareId === squareId);
  if (alreadyPainted) {
    return { valid: false, reason: 'Square is already painted' };
  }

  // Wild cubes can go anywhere, but only one per canvas
  if (isWild) {
    const hasWild = canvas.painted_squares.some(ps => ps.color === 'wild');
    if (hasWild) {
      return { valid: false, reason: 'Canvas already has a wild cube' };
    }
    return { valid: true };
  }

  // Check if color is allowed on this square
  const allowedColors = square.allowedColors || [];
  if (!allowedColors.includes(color as any)) {
    return { valid: false, reason: `Color ${color} not allowed on this square. Allowed: ${allowedColors.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Get all completed canvases for a player
 */
export async function getCompletedCanvases(playerId: string): Promise<PlayerCanvas[]> {
  const canvases = await canvasDb.getPlayerCanvases(playerId);
  return canvases.filter(c => c.completed);
}

/**
 * Get canvas completion summary for all players
 */
export async function getCompletionSummary(
  players: Player[]
): Promise<Array<{
  playerId: string;
  playerName: string;
  completedCount: number;
  totalScore: number;
  recentCompletion?: { canvasName: string; stars: number };
}>> {
  const summary = [];

  for (const player of players) {
    const canvases = await canvasDb.getPlayerCanvases(player.id);
    const completed = canvases.filter(c => c.completed);
    
    // Find most recent completion
    let recentCompletion;
    if (completed.length > 0) {
      const recent = completed.sort((a, b) => 
        (b.completed_at?.getTime() || 0) - (a.completed_at?.getTime() || 0)
      )[0];
      if (recent.definition) {
        recentCompletion = {
          canvasName: recent.definition.name,
          stars: recent.definition.star_value,
        };
      }
    }

    summary.push({
      playerId: player.id,
      playerName: player.name,
      completedCount: completed.length,
      totalScore: player.score,
      recentCompletion,
    });
  }

  return summary;
}
