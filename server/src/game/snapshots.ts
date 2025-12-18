import { GameId, GameState } from '../types';

export interface SerializedGameState {
  id: GameId;
  payload: string;
  recordedAt: string;
}

const snapshotStore = new Map<GameId, SerializedGameState[]>();

export const serializeGameState = (state: GameState): string => JSON.stringify(state);

export const prepareSnapshotForPersistence = (state: GameState): SerializedGameState => ({
  id: state.id,
  payload: serializeGameState(state),
  recordedAt: state.updatedAt
});

export const storeSnapshot = (state: GameState): void => {
  const record = prepareSnapshotForPersistence(state);
  const existing = snapshotStore.get(state.id) ?? [];
  snapshotStore.set(state.id, [...existing, record]);
};

export const getSnapshots = (gameId: GameId): SerializedGameState[] => snapshotStore.get(gameId) ?? [];
