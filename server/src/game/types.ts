import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';
import type { PlayerId } from '../../../shared/types/common';

export interface StartGamePayload {
  paintBag: PaintCube[];
  canvasDeck: CanvasDefinition[];
  initialPaintMarket?: PaintCube[];
  initialMarketSize?: number;
  turnOrder?: PlayerId[];
  firstPlayerId?: PlayerId;
  timestamp?: string;
}
