import type { GameId, GameState, PlayerId } from '../types';
import { lobbySessionManager } from '../game';
import type { PlayerProfile } from '../../../shared/types/player';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { StartGamePayload } from '../game/types';

export const createGame = (hostProfile: PlayerProfile): LobbySnapshot => {
  return lobbySessionManager.createSession(hostProfile);
};

export const joinGame = (gameId: GameId, profile: PlayerProfile): LobbySnapshot => {
  return lobbySessionManager.joinGame(gameId, profile);
};

export const leaveGame = (gameId: GameId, playerId: PlayerId): LobbySnapshot => {
  return lobbySessionManager.leaveGame(gameId, playerId);
};

export const fetchLobby = (gameId: GameId): LobbySnapshot => {
  return lobbySessionManager.fetchLobby(gameId);
};

export const startGame = async (gameId: GameId, playerId: PlayerId, payload: StartGamePayload): Promise<GameState> => {
  return lobbySessionManager.startGame(gameId, payload, playerId);
};
