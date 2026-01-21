"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlayer = registerPlayer;
exports.unregisterPlayer = unregisterPlayer;
exports.getPlayerConnection = getPlayerConnection;
exports.getPlayerBySocketId = getPlayerBySocketId;
exports.getSocketIdByPlayer = getSocketIdByPlayer;
exports.getGameConnections = getGameConnections;
exports.updatePing = updatePing;
exports.getConnectedPlayers = getConnectedPlayers;
exports.isPlayerConnected = isPlayerConnected;
// Player connection management service
const playerDb = __importStar(require("../../database/playerDb"));
const connections = new Map();
const PING_INTERVAL = 30000; // 30 seconds
const DISCONNECT_TIMEOUT = 60000; // 60 seconds
function registerPlayer(socketId, playerId, gameId) {
    connections.set(socketId, {
        playerId,
        socketId,
        gameId,
        lastPing: Date.now(),
    });
    playerDb.updatePlayerConnection(playerId, true).catch(console.error);
}
function unregisterPlayer(socketId) {
    const connection = connections.get(socketId);
    if (!connection)
        return null;
    connections.delete(socketId);
    playerDb.updatePlayerConnection(connection.playerId, false).catch(console.error);
    return connection;
}
function getPlayerConnection(socketId) {
    return connections.get(socketId) || null;
}
function getPlayerBySocketId(socketId) {
    const connection = connections.get(socketId);
    return connection?.playerId || null;
}
function getSocketIdByPlayer(playerId) {
    for (const [socketId, conn] of connections.entries()) {
        if (conn.playerId === playerId) {
            return socketId;
        }
    }
    return null;
}
function getGameConnections(gameId) {
    const gameConnections = [];
    for (const conn of connections.values()) {
        if (conn.gameId === gameId) {
            gameConnections.push(conn);
        }
    }
    return gameConnections;
}
function updatePing(socketId) {
    const connection = connections.get(socketId);
    if (connection) {
        connection.lastPing = Date.now();
    }
}
function getConnectedPlayers(gameId) {
    const gameConnections = getGameConnections(gameId);
    return gameConnections.map(conn => conn.playerId);
}
function isPlayerConnected(playerId) {
    for (const conn of connections.values()) {
        if (conn.playerId === playerId) {
            const timeSinceLastPing = Date.now() - conn.lastPing;
            return timeSinceLastPing < DISCONNECT_TIMEOUT;
        }
    }
    return false;
}
// Cleanup disconnected players
setInterval(() => {
    const now = Date.now();
    const toRemove = [];
    for (const [socketId, conn] of connections.entries()) {
        const timeSinceLastPing = now - conn.lastPing;
        if (timeSinceLastPing > DISCONNECT_TIMEOUT) {
            toRemove.push(socketId);
        }
    }
    for (const socketId of toRemove) {
        unregisterPlayer(socketId);
    }
}, PING_INTERVAL);
