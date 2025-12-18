import type { GameState } from './game';
import type { GameActionIntent } from './gameActions';
import type { PlayerId } from './common';

export interface GameActionSummary {
  playerId: PlayerId;
  actionType: string;
  timestamp: string;
}

export interface GameStateUpdatePayload {
  state: GameState;
  lastAction?: GameActionSummary;
}

export type GameRealtimeServerMessage =
  | { type: 'GAME_STATE_UPDATED'; payload: GameStateUpdatePayload }
  | { type: 'ERROR'; payload: { message: string } };

export type GameRealtimeClientMessage = {
  type: 'GAME_ACTION';
  payload: GameActionIntent;
};
