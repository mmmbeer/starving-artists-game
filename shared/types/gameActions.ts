import type { CanvasDefinition } from './canvas';
import type { PaintCube } from './paint';
import type { GamePhase } from './game';
import type { PlayerId } from './common';

export type GameActionType =
  | 'INITIALIZE_GAME'
  | 'ADVANCE_PHASE'
  | 'DRAW_PAINT_CUBES'
  | 'BUY_CANVAS'
  | 'APPLY_PAINT_TO_CANVAS'
  | 'DECLARE_SELL_INTENT'
  | 'END_TURN';

export interface ActionMeta {
  timestamp?: string;
}

export interface PlayerSetup {
  id: PlayerId;
  displayName: string;
  order?: number;
  nutrition?: number;
  score?: number;
  studioCubes?: PaintCube[];
}

export interface InitializeGamePayload {
  gameId: string;
  timestamp: string;
  players: PlayerSetup[];
  turnOrder: PlayerId[];
  paintBag: PaintCube[];
  canvasDeck: CanvasDefinition[];
  initialPaintMarket?: PaintCube[];
  initialMarketSize?: number;
  firstPlayerId?: PlayerId;
}

export interface DrawPaintCubesPayload {
  playerId: PlayerId;
  count: number;
}

export interface BuyCanvasPayload {
  playerId: PlayerId;
  slotIndex: number;
}

export interface ApplyPaintToCanvasPayload {
  playerId: PlayerId;
  canvasId: string;
  squareId: string;
  cubeId: string;
}

export interface DeclareSellIntentPayload {
  playerId: PlayerId;
  canvasIds: string[];
}

export interface EndTurnPayload {
  playerId: PlayerId;
}

export type GameActionIntent =
  | { type: 'DRAW_PAINT_CUBES'; payload: DrawPaintCubesPayload }
  | { type: 'BUY_CANVAS'; payload: BuyCanvasPayload }
  | { type: 'APPLY_PAINT_TO_CANVAS'; payload: ApplyPaintToCanvasPayload }
  | { type: 'END_TURN'; payload: EndTurnPayload }
  | { type: 'DECLARE_SELL_INTENT'; payload: DeclareSellIntentPayload };

export interface GameActionPhaseTransitionPayload {
  targetPhase?: GamePhase;
}
