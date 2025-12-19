import type { PaintCube } from '../../../shared/types/paint';
import type { CanvasState, CanvasSquareDefinition } from '../../../shared/types/canvas';

export interface CanvasRendererProps {
  canvas: CanvasState;
  optimisticPlacements: Record<string, PaintCube>;
  wildUsed: boolean;
}

export interface CanvasSquareOverlayProps {
  canvasId: string;
  square: CanvasSquareDefinition;
  placedCube?: PaintCube;
  optimisticCube?: PaintCube;
  wildUsed: boolean;
}
