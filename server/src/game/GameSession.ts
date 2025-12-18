import { GamePhase, GameState, PlayerId } from '../types';
import type { PlayerProfile } from '../../../shared/types/player';
import type { LobbyPlayerView, LobbySnapshot } from '../../../shared/types/lobby';
import { gameReducer } from './reducer';
import { AdvancePhaseAction, GameAction, InitializeGameAction } from './actions';
import type { InitializeGamePayload } from '../../../shared/types/gameActions';
import { StartGamePayload } from './types';

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;

const createTimestamp = () => new Date().toISOString();

const buildEmptyGameState = (gameId: string): GameState => {
  const timestamp = createTimestamp();
  return {
    id: gameId,
    phase: GamePhase.LOBBY,
    players: [],
    turnOrder: [],
    currentPlayerIndex: 0,
    turn: {
      order: [],
      currentPlayerIndex: 0,
      actionsTakenThisPhase: 0
    },
    day: {
      dayNumber: 1,
      hasNutritionApplied: false
    },
    canvasMarket: {
      slots: []
    },
    paintMarket: {
      cubes: [],
      lastUpdated: timestamp
    },
    paintBag: [],
    canvasDeck: [],
    sellIntents: {},
    firstPlayerId: undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

const toPlayerView = (player: GameState['players'][number]): LobbyPlayerView => ({
  id: player.id,
  displayName: player.displayName,
  order: player.order,
  isConnected: player.isConnected
});

export class GameSession {
  private readonly gameId: string;
  private readonly joinLink: string;
  private readonly hostId: PlayerId;
  private state: GameState;

  constructor(gameId: string, host: PlayerProfile) {
    this.gameId = gameId;
    this.joinLink = `/lobby/${gameId}`;
    this.hostId = host.id;
    this.state = buildEmptyGameState(gameId);
    this.addOrReconnectPlayer(host);
  }

  public getId(): string {
    return this.gameId;
  }

  public getHostId(): PlayerId {
    return this.hostId;
  }

  public getState(): GameState {
    return this.state;
  }

  public isLobbyFull(): boolean {
    return this.state.players.length >= MAX_PLAYERS;
  }

  public hasPlayer(playerId: PlayerId): boolean {
    return this.state.players.some((player) => player.id === playerId);
  }

  public getLobbySnapshot(): LobbySnapshot {
    const sortedPlayers = [...this.state.players].sort((a, b) => a.order - b.order);
    return {
      gameId: this.gameId,
      hostId: this.hostId,
      phase: this.state.phase,
      players: sortedPlayers.map(toPlayerView),
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
      joinLink: this.joinLink,
      readiness: {
        canStart: this.canStartGame(),
        isLobbyFull: this.state.players.length >= MAX_PLAYERS,
        playerCount: this.state.players.length,
        minPlayers: MIN_PLAYERS,
        maxPlayers: MAX_PLAYERS
      }
    };
  }

  public addOrReconnectPlayer(profile: PlayerProfile): { snapshot: LobbySnapshot; isReconnect: boolean } {
    const existing = this.state.players.find((player) => player.id === profile.id);

    if (existing) {
      existing.displayName = profile.displayName;
      existing.isConnected = true;
      this.touch();
      return { snapshot: this.getLobbySnapshot(), isReconnect: true };
    }

    if (this.isLobbyFull()) {
      throw new Error('Lobby is full');
    }

    const order = this.state.players.length + 1;
    const newPlayer = {
      id: profile.id,
      displayName: profile.displayName,
      order,
      nutrition: 5,
      score: 0,
      isConnected: true,
      studio: {
        paintCubes: [],
        canvases: []
      }
    };

    this.state.players.push(newPlayer);
    this.state.firstPlayerId = this.state.firstPlayerId ?? newPlayer.id;
    this.touch();

    return { snapshot: this.getLobbySnapshot(), isReconnect: false };
  }

  public markPlayerDisconnected(playerId: PlayerId): LobbySnapshot {
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not connected to game ${this.gameId}`);
    }

    player.isConnected = false;
    this.touch();
    return this.getLobbySnapshot();
  }

  public startGame(payload: StartGamePayload, requestedBy: PlayerId): GameState {
    if (requestedBy !== this.hostId) {
      throw new Error('Only the host can start the game');
    }

    if (this.state.phase !== GamePhase.LOBBY) {
      throw new Error('Game has already started');
    }

    if (this.state.players.length < MIN_PLAYERS) {
      throw new Error(`At least ${MIN_PLAYERS} player(s) required to start`);
    }

    const timestamp = payload.timestamp ?? createTimestamp();
    const playerSetups = this.buildPlayerSetups();
    const turnOrder = payload.turnOrder ?? playerSetups.map((player) => player.id);
    const desiredFirstPlayer = payload.firstPlayerId ?? turnOrder[0];
    if (!payload.canvasDeck || payload.canvasDeck.length === 0) {
      throw new Error('Canvas deck must contain cards before starting the game');
    }

    const initializePayload: InitializeGamePayload = {
      gameId: this.gameId,
      timestamp,
      players: playerSetups,
      turnOrder,
      paintBag: payload.paintBag.map((cube) => ({ ...cube })),
      canvasDeck: payload.canvasDeck.map((canvas) => ({ ...canvas })),
      initialPaintMarket: payload.initialPaintMarket?.map((cube) => ({ ...cube })),
      initialMarketSize: payload.initialMarketSize,
      firstPlayerId: desiredFirstPlayer
    };

    const initializeAction: InitializeGameAction = {
      type: 'INITIALIZE_GAME',
      payload: initializePayload
    };

    const initResult = gameReducer(undefined, initializeAction);
    if ('error' in initResult) {
      throw new Error(initResult.error.message);
    }

    const advanceAction: AdvancePhaseAction = {
      type: 'ADVANCE_PHASE',
      payload: { targetPhase: GamePhase.MORNING },
      meta: { timestamp }
    };

    const advanceResult = gameReducer(initResult.nextState, advanceAction);
    if ('error' in advanceResult) {
      throw new Error(advanceResult.error.message);
    }

    this.state = advanceResult.nextState;
    return this.state;
  }

  public applyAction(action: GameAction): GameState {
    const result = gameReducer(this.state, action);
    if ('error' in result) {
      throw new Error(result.error.message);
    }
    this.state = result.nextState;
    return this.state;
  }

  private buildPlayerSetups() {
    return [...this.state.players]
      .sort((a, b) => a.order - b.order)
      .map((player) => ({
        id: player.id,
        displayName: player.displayName,
        order: player.order,
        nutrition: player.nutrition,
        score: player.score,
        studioCubes: player.studio.paintCubes
      }));
  }

  private canStartGame(): boolean {
    return this.state.phase === GamePhase.LOBBY && this.state.players.length >= MIN_PLAYERS;
  }

  private touch() {
    this.state = {
      ...this.state,
      updatedAt: createTimestamp()
    };
  }
}
