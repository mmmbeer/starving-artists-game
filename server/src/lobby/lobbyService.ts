import { gameReducer } from '../game';
import type {
  AdvancePhaseAction,
  InitializeGameAction,
  InitializeGamePayload,
  PlayerSetup
} from '../game/actions';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';
import { PlayerProfile } from '../../../shared/types/player';
import { GameId, GamePhase, GameState, PlayerId, PlayerState } from '../types';

export interface StartGamePayload {
  paintBag: PaintCube[];
  canvasDeck: CanvasDefinition[];
  initialPaintMarket?: PaintCube[];
  initialMarketSize?: number;
  turnOrder?: PlayerId[];
  firstPlayerId?: PlayerId;
  timestamp?: string;
}

const lobbyStore = new Map<GameId, GameState>();
let nextGameSequence = 1;

const createTimestamp = () => new Date().toISOString();

const snapshotState = (state: GameState): GameState => ({
  ...state,
  updatedAt: createTimestamp()
});

export const createGame = (): GameState => {
  const gameId: GameId = `game-${nextGameSequence++}`;
  const createdAt = createTimestamp();
  const newState: GameState = {
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
      lastUpdated: createdAt
    },
    paintBag: [],
    canvasDeck: [],
    sellIntents: {},
    firstPlayerId: undefined,
    createdAt,
    updatedAt: createdAt
  };

  lobbyStore.set(gameId, newState);
  return newState;
};

export const joinGame = (gameId: GameId, player: PlayerProfile): GameState => {
  const existing = lobbyStore.get(gameId);
  if (!existing) {
    throw new Error(`Game ${gameId} not found`);
  }

  const isAlreadyJoined = existing.players.some((p) => p.id === player.id);
  if (isAlreadyJoined) {
    return snapshotState(existing);
  }

  const nextOrder = existing.players.length + 1;
  const newPlayer: PlayerState = {
    id: player.id,
    displayName: player.displayName,
    order: nextOrder,
    nutrition: 5,
    score: 0,
    isConnected: true,
    studio: {
      paintCubes: [],
      canvases: []
    }
  };

  const updated: GameState = {
    ...existing,
    players: [...existing.players, newPlayer],
    firstPlayerId: existing.firstPlayerId ?? newPlayer.id
  };

  lobbyStore.set(gameId, updated);
  return snapshotState(updated);
};

const buildPlayerSetups = (players: PlayerState[]): PlayerSetup[] =>
  players
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((player) => ({
      id: player.id,
      displayName: player.displayName,
      order: player.order,
      nutrition: player.nutrition,
      score: player.score,
      studioCubes: player.studio.paintCubes
    }));

export const startGame = (gameId: GameId, config: StartGamePayload): GameState => {
  const existing = lobbyStore.get(gameId);
  if (!existing) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (existing.phase !== GamePhase.LOBBY) {
    throw new Error('Game has already started');
  }

  if (!config.paintBag || config.paintBag.length === 0) {
    throw new Error('Paint bag is required to start the game');
  }

  if (!config.canvasDeck || config.canvasDeck.length === 0) {
    throw new Error('Canvas deck is required to start the game');
  }

  if (existing.players.length === 0) {
    throw new Error('At least one player is required to start the game');
  }

  const timestamp = config.timestamp ?? createTimestamp();

  const playerSetups = buildPlayerSetups(existing.players);
  const turnOrder = config.turnOrder ?? playerSetups.map((player) => player.id);
  const desiredFirstPlayer = config.firstPlayerId ?? turnOrder[0];

  const payload: InitializeGamePayload = {
    gameId,
    timestamp,
    players: playerSetups,
    turnOrder,
    paintBag: config.paintBag.map((cube) => ({ ...cube })),
    canvasDeck: config.canvasDeck.map((canvas) => ({ ...canvas })),
    initialPaintMarket: config.initialPaintMarket?.map((cube) => ({ ...cube })),
    initialMarketSize: config.initialMarketSize,
    firstPlayerId: desiredFirstPlayer
  };

  const action: InitializeGameAction = {
    type: 'INITIALIZE_GAME',
    payload
  };

  const result = gameReducer(undefined, action);
  if ('error' in result) {
    throw new Error(result.error.message);
  }

  lobbyStore.set(gameId, result.nextState);
  return result.nextState;
};

export const fetchLobby = (gameId: GameId): GameState => {
  const existing = lobbyStore.get(gameId);
  if (!existing) {
    throw new Error(`Game ${gameId} not found`);
  }
  return snapshotState(existing);
};

export const advanceGamePhase = (gameId: GameId, targetPhase?: GamePhase, timestamp?: string): GameState => {
  const existing = lobbyStore.get(gameId);
  if (!existing) {
    throw new Error(`Game ${gameId} not found`);
  }

  const action: AdvancePhaseAction = {
    type: 'ADVANCE_PHASE',
    payload: targetPhase ? { targetPhase } : undefined,
    meta: timestamp ? { timestamp } : undefined
  };

  const result = gameReducer(existing, action);
  if ('error' in result) {
    throw new Error(result.error.message);
  }

  lobbyStore.set(gameId, result.nextState);
  return result.nextState;
};
