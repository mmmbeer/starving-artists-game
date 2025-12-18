import { GameState, PlayerId } from '../types';
import type { CanvasDefinition, CanvasState, CanvasSquareDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';

export const drawFromBag = (bag: PaintCube[], count: number) => {
  const drawn = bag.slice(0, count);
  const remaining = bag.slice(count);
  return { drawn, remaining };
};

export const createCanvasState = (
  definition: CanvasDefinition,
  createdAt: string,
  options?: {
    ownerId?: PlayerId;
    overrideId?: string;
  }
): CanvasState => ({
  id: options?.overrideId ?? definition.id,
  definition,
  ownerId: options?.ownerId,
  placedCubes: {},
  createdAt
});

export const findPlayerById = (state: GameState, playerId: PlayerId) =>
  state.players.find((player) => player.id === playerId);

export const findPlayerCanvas = (state: GameState, playerId: PlayerId, canvasId: string) => {
  const player = findPlayerById(state, playerId);
  return player?.studio.canvases.find((canvas) => canvas.id === canvasId);
};

export const getSquareDefinition = (
  canvas: CanvasState,
  squareId: string
): CanvasSquareDefinition | undefined => canvas.definition.squares.find((square) => square.id === squareId);

export const isCanvasComplete = (canvas: CanvasState) =>
  canvas.definition.squares.length > 0 && Object.keys(canvas.placedCubes).length >= canvas.definition.squares.length;

export const wildCubeCount = (canvas: CanvasState) =>
  Object.values(canvas.placedCubes).filter((cube) => cube.color === 'wild').length;
