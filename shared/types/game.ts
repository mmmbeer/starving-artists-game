import { CanvasMarketState, CanvasState } from './canvas';
import { PaintCube, PaintMarketState } from './paint';
import { GameId, PlayerId, PaintColor, PAINT_COLOR_PALETTE } from './common';

export enum GamePhase {
  LOBBY = 'LOBBY',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  SELLING = 'SELLING',
  ENDED = 'ENDED'
}

export interface StudioState {
  paintCubes: PaintCube[];
  canvases: CanvasState[];
}

export interface PlayerState {
  id: PlayerId;
  displayName: string;
  order: number;
  nutrition: number;
  score: number;
  isConnected: boolean;
  studio: StudioState;
}

export interface TurnState {
  order: PlayerId[];
  currentPlayerIndex: number;
  actionsTakenThisPhase: number;
}

export interface DayState {
  dayNumber: number;
  hasNutritionApplied: boolean;
}

export interface GameState {
  id: GameId;
  phase: GamePhase;
  players: PlayerState[];
  turnOrder: PlayerId[];
  currentPlayerIndex: number;
  turn: TurnState;
  day: DayState;
  canvasMarket: CanvasMarketState;
  paintMarket: PaintMarketState;
  paintBag: PaintCube[];
  canvasDeck: CanvasState[];
  sellIntents: Record<PlayerId, string[]>;
  firstPlayerId?: PlayerId;
  createdAt: string;
  updatedAt: string;
}

export { GameId, PlayerId, PaintColor, PAINT_COLOR_PALETTE, GamePhase };
