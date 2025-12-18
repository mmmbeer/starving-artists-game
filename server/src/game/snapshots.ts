import { GameState } from '../types';
import { persistSnapshot, getPersistedSnapshots, SerializedGameStateRecord } from '../db/snapshots';

export const serializeGameState = (state: GameState): string => JSON.stringify(state);

export const prepareSnapshotForPersistence = (state: GameState): SerializedGameStateRecord => ({
  id: state.id,
  payload: serializeGameState(state),
  recordedAt: state.updatedAt
});

export const storeSnapshot = (state: GameState): void => {
  const record = prepareSnapshotForPersistence(state);
  persistSnapshot(record);
};

export { getPersistedSnapshots as getSnapshots };
