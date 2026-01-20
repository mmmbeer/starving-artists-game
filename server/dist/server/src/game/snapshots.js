"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSnapshots = exports.storeSnapshot = exports.prepareSnapshotForPersistence = exports.serializeGameState = void 0;
const snapshots_1 = require("../db/snapshots");
Object.defineProperty(exports, "getSnapshots", { enumerable: true, get: function () { return snapshots_1.getPersistedSnapshots; } });
const serializeGameState = (state) => JSON.stringify(state);
exports.serializeGameState = serializeGameState;
const prepareSnapshotForPersistence = (state) => ({
    id: state.id,
    payload: (0, exports.serializeGameState)(state),
    recordedAt: state.updatedAt
});
exports.prepareSnapshotForPersistence = prepareSnapshotForPersistence;
const storeSnapshot = (state) => {
    const record = (0, exports.prepareSnapshotForPersistence)(state);
    (0, snapshots_1.persistSnapshot)(record);
};
exports.storeSnapshot = storeSnapshot;
