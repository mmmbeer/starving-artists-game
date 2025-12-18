import { GamePhase, GameId, PlayerId } from './game';

export interface LobbyPlayerView {
  id: PlayerId;
  displayName: string;
  order: number;
  isConnected: boolean;
}

export interface LobbyReadiness {
  canStart: boolean;
  isLobbyFull: boolean;
  playerCount: number;
  minPlayers: number;
  maxPlayers: number;
}

export interface LobbySnapshot {
  gameId: GameId;
  hostId: PlayerId;
  phase: GamePhase;
  players: LobbyPlayerView[];
  createdAt: string;
  updatedAt: string;
  joinLink: string;
  readiness: LobbyReadiness;
}
