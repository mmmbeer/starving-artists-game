import { GameId, GamePhase, GameState, PlayerId, PlayerState } from '../../../shared/types/game';
import { PlayerProfile } from '../../../shared/types/player';

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

export const fetchLobby = (gameId: GameId): GameState => {
  const existing = lobbyStore.get(gameId);
  if (!existing) {
    throw new Error(`Game ${gameId} not found`);
  }
  return snapshotState(existing);
};
