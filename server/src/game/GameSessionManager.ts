import { EventEmitter } from 'events';
import { GamePhase, GameState } from '../types';
import { GameSession } from './GameSession';
import type { GameAction } from './actions';
import type { PlayerProfile } from '../../../shared/types/player';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { GameId, PlayerId } from '../../../shared/types/common';
import { persistGameMetadata, persistPlayerMembership } from '../db/sessionPersistence';
import type { PersistPlayerRecord } from '../db/sessionPersistence';
import type { StartGamePayload } from './types';
import type { GameActionSummary } from '../../../shared/types/realtime';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import { fetchCanvasDefinitions } from '../db/canvases';
export type { GameActionSummary } from '../../../shared/types/realtime';

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

export interface GameStateUpdatedEvent {
  gameId: GameId;
  state: GameState;
  action?: GameActionSummary;
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

  public fetchGameState(gameId: GameId): GameState {
    const session = this.getSessionOrThrow(gameId);
    return session.getState();
  }

  public isPlayerInGame(gameId: GameId, playerId: PlayerId): boolean {
    const session = this.sessions.get(gameId);
    if (!session) {
      return false;
    }
    return session.hasPlayer(playerId);
  }

  public async startGame(gameId: GameId, payload: StartGamePayload, requestedBy: PlayerId): Promise<GameState> {
    const session = this.getSessionOrThrow(gameId);
    const canvasDeck = await this.resolveCanvasDeck(gameId, payload);
    const payloadWithDeck: StartGamePayload = {
      ...payload,
      canvasDeck
    };
    const newState = session.startGame(payloadWithDeck, requestedBy);
    void persistGameMetadata(gameId, session.getHostId(), newState.phase);
    session.getState().players.forEach((player) => {
      this.persistPlayer(session, player.id);
    });
    this.emitLobbyUpdate(gameId, session.getLobbySnapshot(), 'start', requestedBy);
    this.emitGameStarted(gameId, newState);
    this.emitGameStateUpdated(gameId, newState);
    return newState;
  }

  public applyAction(gameId: GameId, action: GameAction, requestedBy: PlayerId): GameState {
    const session = this.getSessionOrThrow(gameId);
    const playerId = this.getActionPlayerId(action);
    if (playerId && playerId !== requestedBy) {
      throw new Error('Player may only act on their own turn');
    }

    const timestamp = new Date().toISOString();
    const actionWithMeta = {
      ...action,
      meta: {
        ...(action.meta ?? {}),
        timestamp
      }
    };

    const nextState = session.applyAction(actionWithMeta);
    void persistGameMetadata(gameId, session.getHostId(), nextState.phase);
    const summary = playerId
      ? { playerId, actionType: action.type, timestamp }
      : undefined;
    this.emitGameStateUpdated(gameId, nextState, summary);
    return nextState;
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

  private emitGameStateUpdated(gameId: GameId, state: GameState, action?: GameActionSummary) {
    this.emit('game-state-updated', { gameId, state, action } as GameStateUpdatedEvent);
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

  private getActionPlayerId(action: GameAction): PlayerId | undefined {
    switch (action.type) {
      case 'DRAW_PAINT_CUBES':
      case 'BUY_CANVAS':
      case 'APPLY_PAINT_TO_CANVAS':
      case 'DECLARE_SELL_INTENT':
      case 'END_TURN':
        return action.payload.playerId;
      default:
        return undefined;
    }
  }

  private async resolveCanvasDeck(gameId: GameId, payload: StartGamePayload): Promise<CanvasDefinition[]> {
    if (payload.canvasDeckOverride && payload.canvasDeckOverride.length > 0) {
      return payload.canvasDeckOverride.map((canvas) => this.cloneCanvasDefinition(canvas));
    }

    if (payload.canvasDeck && payload.canvasDeck.length > 0) {
      return payload.canvasDeck.map((canvas) => this.cloneCanvasDefinition(canvas));
    }

    const definitions = await fetchCanvasDefinitions();
    if (definitions.length === 0) {
      throw new Error('No canvases available to build the deck');
    }

    return this.shuffleDefinitions(definitions, gameId);
  }

  private cloneCanvasDefinition(canvas: CanvasDefinition): CanvasDefinition {
    return {
      ...canvas,
      squares: canvas.squares.map((square) => ({
        ...square,
        position: { ...square.position }
      }))
    };
  }

  private shuffleDefinitions(source: CanvasDefinition[], seedSource: string): CanvasDefinition[] {
    const seed = this.hashSeed(seedSource);
    const shuffled = source.map((definition) => this.cloneCanvasDefinition(definition));
    let current = seed;
    const nextRandom = () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(nextRandom() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  private hashSeed(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 1000000000;
    }
    return hash || 1;
  }
}
