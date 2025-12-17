import { GameId, GamePhase, GameState, PlayerId, PlayerState } from '../../../shared/types/game';

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
    firstPlayerId: undefined,
    createdAt,
    updatedAt: createdAt
  };

  lobbyStore.set(gameId, newState);
  return newState;
};

export const joinGame = (gameId: GameId, player: PlayerState): GameState => {
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
    ...player,
    order: nextOrder,
    nutrition: player.nutrition ?? 5,
    score: player.score ?? 0,
    isConnected: player.isConnected ?? true
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
