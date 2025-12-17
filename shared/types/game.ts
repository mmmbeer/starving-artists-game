export type GameId = string;
export type PlayerId = string;

export enum GamePhase {
  LOBBY = 'LOBBY',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  SELLING = 'SELLING',
  ENDED = 'ENDED'
}

export type PaintColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'black' | 'wild';

export interface PlayerState {
  id: PlayerId;
  displayName: string;
  order?: number;
  nutrition?: number;
  score?: number;
  isConnected?: boolean;
}

export interface GameState {
  id: GameId;
  phase: GamePhase;
  players: PlayerState[];
  firstPlayerId?: PlayerId;
  createdAt: string;
  updatedAt: string;
  canvasId?: string;
}
