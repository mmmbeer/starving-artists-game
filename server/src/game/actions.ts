import { GamePhase, PlayerId } from '../types';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';

export interface ActionMeta {
  timestamp?: string;
}

export interface GameError {
  message: string;
  code?: string;
}

interface GameActionBase {
  meta?: ActionMeta;
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

export interface InitializeGameAction extends GameActionBase {
  type: 'INITIALIZE_GAME';
  payload: InitializeGamePayload;
}

export interface AdvancePhaseAction extends GameActionBase {
  type: 'ADVANCE_PHASE';
  payload?: {
    targetPhase?: GamePhase;
  };
}

export interface DrawPaintCubesAction extends GameActionBase {
  type: 'DRAW_PAINT_CUBES';
  payload: {
    playerId: PlayerId;
    count: number;
  };
}

export interface BuyCanvasAction extends GameActionBase {
  type: 'BUY_CANVAS';
  payload: {
    playerId: PlayerId;
    slotIndex: number;
  };
}

export interface ApplyPaintToCanvasAction extends GameActionBase {
  type: 'APPLY_PAINT_TO_CANVAS';
  payload: {
    playerId: PlayerId;
    canvasId: string;
    squareId: string;
    cubeId: string;
  };
}

export interface DeclareSellIntentAction extends GameActionBase {
  type: 'DECLARE_SELL_INTENT';
  payload: {
    playerId: PlayerId;
    canvasIds: string[];
  };
}

export type GameAction =
  | InitializeGameAction
  | AdvancePhaseAction
  | DrawPaintCubesAction
  | BuyCanvasAction
  | ApplyPaintToCanvasAction
  | DeclareSellIntentAction;

export type ActionResult =
  | {
      nextState: import('../types').GameState;
    }
  | {
      error: GameError;
    };
