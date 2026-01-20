"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistPlayerMembership = exports.persistGameMetadata = void 0;
const query_1 = require("./query");
const persistGameMetadata = async (gameId, hostId, phase) => {
    try {
        await (0, query_1.dbQuery)(`
        INSERT INTO game_sessions (game_id, host_id, phase, created_at, updated_at, expires_at)
        VALUES (?, ?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 48 HOUR))
        ON DUPLICATE KEY UPDATE host_id = VALUES(host_id), phase = VALUES(phase), updated_at = NOW(),
          expires_at = DATE_ADD(NOW(), INTERVAL 48 HOUR)
      `, [gameId, hostId, phase]);
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist game metadata', error.message);
    }
};
exports.persistGameMetadata = persistGameMetadata;
const persistPlayerMembership = async (gameId, player) => {
    try {
        await (0, query_1.dbQuery)(`
        INSERT INTO game_session_players (session_id, player_id, display_name, player_order, is_connected, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), player_order = VALUES(player_order),
          is_connected = VALUES(is_connected), updated_at = NOW()
      `, [gameId, player.id, player.displayName, player.order, player.isConnected]);
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist player membership', error.message);
    }
};
exports.persistPlayerMembership = persistPlayerMembership;
