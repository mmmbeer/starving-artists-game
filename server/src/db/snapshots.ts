import { GameId } from '../types';

export interface SerializedGameStateRecord {
  id: GameId;
  payload: string;
  recordedAt: string;
}

const snapshotStore = new Map<GameId, SerializedGameStateRecord[]>();

export const persistSnapshot = (record: SerializedGameStateRecord): void => {
  const existing = snapshotStore.get(record.id) ?? [];
  snapshotStore.set(record.id, [...existing, record]);
};

export const getPersistedSnapshots = (gameId: GameId): SerializedGameStateRecord[] =>
  snapshotStore.get(gameId) ?? [];
