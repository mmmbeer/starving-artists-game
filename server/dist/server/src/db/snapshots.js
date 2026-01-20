"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersistedSnapshots = exports.persistSnapshot = void 0;
const snapshotStore = new Map();
const persistSnapshot = (record) => {
    const existing = snapshotStore.get(record.id) ?? [];
    snapshotStore.set(record.id, [...existing, record]);
};
exports.persistSnapshot = persistSnapshot;
const getPersistedSnapshots = (gameId) => snapshotStore.get(gameId) ?? [];
exports.getPersistedSnapshots = getPersistedSnapshots;
