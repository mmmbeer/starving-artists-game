import { PaintColor, PlayerId } from './common';

export interface PaintCube {
  id: string;
  color: PaintColor;
  ownerId?: PlayerId;
}

export interface PaintMarketState {
  cubes: PaintCube[];
  lastUpdated: string;
}
