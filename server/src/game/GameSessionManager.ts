import { EventEmitter } from 'events';
import { GamePhase, GameState } from '../types';
import { GameSession } from './GameSession';
import type { PlayerProfile } from '../../../shared/types/player';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { GameId, PlayerId } from '../../../shared/types/common';
import { persistGameMetadata, persistPlayerMembership } from '../db/sessionPersistence';
import type { PersistPlayerRecord } from '../db/sessionPersistence';
import type { StartGamePayload } from './types';

export type LobbyEventReason = 'created' | 'join' | 'reconnect' | 'leave' | 'start';

export interface LobbyEvent {
  gameId: GameId;
  snapshot: LobbySnapshot;
  reason: LobbyEventReason;
  playerId?: PlayerId;
}

export interface GameStartedEvent {
  gameId: GameId;
  state: GameState;
}

export class GameSessionManager extends EventEmitter {
  private readonly sessions = new Map<GameId, GameSession>();
  private nextSequence = 1;

  public createSession(host: PlayerProfile): LobbySnapshot {
    const gameId: GameId = `game-${this.nextSequence++}`;
    const session = new GameSession(gameId, host);
    this.sessions.set(gameId, session);
    void persistGameMetadata(gameId, session.getHostId(), session.getState().phase);
    this.persistPlayer(session, host.id);
    const snapshot = session.getLobbySnapshot();
    this.emitLobbyUpdate(gameId, snapshot, 'created', host.id);
    return snapshot;
  }

  public joinGame(gameId: GameId, profile: PlayerProfile): LobbySnapshot {
    const session = this.getSessionOrThrow(gameId);
    if (session.getState().phase !== GamePhase.LOBBY) {
      throw new Error('Game has already started');
    }

    const { snapshot, isReconnect } = session.addOrReconnectPlayer(profile);
    void persistGameMetadata(gameId, session.getHostId(), session.getState().phase);
    this.persistPlayer(session, profile.id);
    const reason: LobbyEventReason = isReconnect ? 'reconnect' : 'join';
    this.emitLobbyUpdate(gameId, snapshot, reason, profile.id);
    return snapshot;
  }

  public leaveGame(gameId: GameId, playerId: PlayerId): LobbySnapshot {
    const session = this.getSessionOrThrow(gameId);
    const snapshot = session.markPlayerDisconnected(playerId);
    void persistGameMetadata(gameId, session.getHostId(), session.getState().phase);
    this.persistPlayer(session, playerId);
    this.emitLobbyUpdate(gameId, snapshot, 'leave', playerId);
    return snapshot;
  }

  public fetchLobby(gameId: GameId): LobbySnapshot {
    const session = this.getSessionOrThrow(gameId);
    return session.getLobbySnapshot();
  }

  public startGame(gameId: GameId, payload: StartGamePayload, requestedBy: PlayerId): GameState {
    const session = this.getSessionOrThrow(gameId);
    const newState = session.startGame(payload, requestedBy);
    void persistGameMetadata(gameId, session.getHostId(), newState.phase);
    session.getState().players.forEach((player) => {
      this.persistPlayer(session, player.id);
    });
    this.emitLobbyUpdate(gameId, session.getLobbySnapshot(), 'start', requestedBy);
    this.emitGameStarted(gameId, newState);
    return newState;
  }

  public destroySession(gameId: GameId): void {
    this.sessions.delete(gameId);
  }

  public hasSession(gameId: GameId): boolean {
    return this.sessions.has(gameId);
  }

  private getSessionOrThrow(gameId: GameId): GameSession {
    const session = this.sessions.get(gameId);
    if (!session) {
      throw new Error(`Game ${gameId} not found`);
    }
    return session;
  }

  private emitLobbyUpdate(gameId: GameId, snapshot: LobbySnapshot, reason: LobbyEventReason, playerId?: PlayerId) {
    this.emit('lobby-updated', { gameId, snapshot, reason, playerId } as LobbyEvent);
  }

  private emitGameStarted(gameId: GameId, state: GameState) {
    this.emit('game-started', { gameId, state } as GameStartedEvent);
  }

  private persistPlayer(session: GameSession, playerId: PlayerId): void {
    const player = session
      .getState()
      .players.find((entry) => entry.id === playerId);

    if (!player) {
      return;
    }

    const record: PersistPlayerRecord = {
      id: player.id,
      displayName: player.displayName,
      order: player.order,
      isConnected: player.isConnected
    };

    void persistPlayerMembership(session.getId(), record);
  }
}
