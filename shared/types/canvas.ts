import { PaintColor, PlayerId } from './common';
import { PaintCube } from './paint';

export interface CanvasSquareDefinition {
  id: string;
  position: {
    x: number;
    y: number;
  };
  allowedColors: PaintColor[];
}

export interface CanvasDefinition {
  id: string;
  title: string;
  artist?: string;
  year?: string;
  starValue: number;
  paintValue: number;
  foodValue: number;
  squares: CanvasSquareDefinition[];
}

export interface CanvasState {
  id: string;
  definition: CanvasDefinition;
  ownerId?: PlayerId;
  placedCubes: Record<string, PaintCube>;
  createdAt: string;
}

export interface CanvasMarketSlot {
  slotIndex: number;
  canvas: CanvasState;
  cost: number;
}

export interface CanvasMarketState {
  slots: CanvasMarketSlot[];
}
