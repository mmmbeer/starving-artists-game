import type {
  ActionMeta,
  PlayerSetup,
  InitializeGamePayload,
  DrawPaintCubesPayload,
  BuyCanvasPayload,
  ApplyPaintToCanvasPayload,
  DeclareSellIntentPayload,
  EndTurnPayload,
  GameActionPhaseTransitionPayload
} from '../../../shared/types/gameActions';

export interface GameError {
  message: string;
  code?: string;
}

interface GameActionBase {
  meta?: ActionMeta;
}

export interface InitializeGameAction extends GameActionBase {
  type: 'INITIALIZE_GAME';
  payload: InitializeGamePayload;
}

export interface AdvancePhaseAction extends GameActionBase {
  type: 'ADVANCE_PHASE';
  payload?: GameActionPhaseTransitionPayload;
}

export interface DrawPaintCubesAction extends GameActionBase {
  type: 'DRAW_PAINT_CUBES';
  payload: DrawPaintCubesPayload;
}

export interface BuyCanvasAction extends GameActionBase {
  type: 'BUY_CANVAS';
  payload: BuyCanvasPayload;
}

export interface ApplyPaintToCanvasAction extends GameActionBase {
  type: 'APPLY_PAINT_TO_CANVAS';
  payload: ApplyPaintToCanvasPayload;
}

export interface DeclareSellIntentAction extends GameActionBase {
  type: 'DECLARE_SELL_INTENT';
  payload: DeclareSellIntentPayload;
}

export interface EndTurnAction extends GameActionBase {
  type: 'END_TURN';
  payload: EndTurnPayload;
}

export type GameAction =
  | InitializeGameAction
  | AdvancePhaseAction
  | DrawPaintCubesAction
  | BuyCanvasAction
  | ApplyPaintToCanvasAction
  | DeclareSellIntentAction
  | EndTurnAction;

export type ActionResult =
  | {
      nextState: import('../types').GameState;
    }
  | {
      error: GameError;
    };
