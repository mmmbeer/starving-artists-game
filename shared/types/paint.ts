import { PaintColor, PlayerId } from './game';

export interface PaintCube {
  id: string;
  color: PaintColor;
  ownerId?: PlayerId;
}

export interface PaintMarket {
  availableCubes: Record<PaintColor, number>;
  lastUpdated: string;
}
