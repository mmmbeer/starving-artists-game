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
exports.startLobbyRealtime = void 0;
const ws_1 = __importStar(require("ws"));
const game_1 = require("../game");
const health_1 = require("./health");
const roomRegistry_1 = require("./roomRegistry");
const ROOM_PATH = '/realtime/lobby';
const sendWebSocketMessage = (socket, message) => {
    if (socket.readyState === ws_1.default.OPEN) {
        socket.send(JSON.stringify(message));
    }
};
const parseQueryParam = (value) => {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value ?? null;
};
const buildSocketError = (socket, message) => {
    socket.emit('realtime_message', { type: 'ERROR', payload: { message } });
    socket.disconnect(true);
};
const startLobbyRealtime = (server, realtimeConfig, socketIoServer) => {
    const wssRegistry = (0, roomRegistry_1.createRoomRegistry)();
    const ioRegistry = (0, roomRegistry_1.createRoomRegistry)();
    let lastBroadcastAt = null;
    const wss = realtimeConfig.enableWebSocket
        ? new ws_1.WebSocketServer({
            server,
            path: ROOM_PATH
        })
        : null;
    const lobbyNamespace = realtimeConfig.enableSocketIo && socketIoServer ? socketIoServer.of('/lobby') : null;
    if (realtimeConfig.enableSocketIo && !socketIoServer) {
        throw new Error('Socket.IO server required when socket.io realtime is enabled');
    }
    const broadcastToWebSockets = (gameId, message) => {
        const sockets = wssRegistry.rooms.get(gameId);
        if (!sockets) {
            return;
        }
        sockets.forEach((socket) => sendWebSocketMessage(socket, message));
    };
    const broadcastToSocketIo = (gameId, message) => {
        const sockets = ioRegistry.rooms.get(gameId);
        if (!sockets) {
            return;
        }
        sockets.forEach((socket) => {
            socket.emit('realtime_message', message);
        });
    };
    const broadcast = (gameId, message) => {
        broadcastToWebSockets(gameId, message);
        broadcastToSocketIo(gameId, message);
        lastBroadcastAt = new Date().toISOString();
    };
    const lobbyListener = (event) => {
        broadcast(event.gameId, {
            type: 'LOBBY_STATE',
            payload: event.snapshot,
            reason: event.reason
        });
    };
    const gameStartedListener = (event) => {
        broadcast(event.gameId, {
            type: 'GAME_STARTED',
            payload: event.state
        });
    };
    game_1.lobbySessionManager.on('lobby-updated', lobbyListener);
    game_1.lobbySessionManager.on('game-started', gameStartedListener);
    const handleWebSocketConnection = (socket, requestUrl) => {
        const url = requestUrl ? new URL(requestUrl, 'http://localhost') : null;
        const gameId = url?.searchParams.get('gameId');
        const playerId = url?.searchParams.get('playerId');
        if (!gameId || !playerId) {
            sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'gameId and playerId are required' } });
            socket.close();
            return;
        }
        try {
            const snapshot = game_1.lobbySessionManager.fetchLobby(gameId);
            const hasPlayer = snapshot.players.some((player) => player.id === playerId);
            if (!hasPlayer) {
                sendWebSocketMessage(socket, {
                    type: 'ERROR',
                    payload: { message: 'Player not registered in this lobby' }
                });
                socket.close();
                return;
            }
            wssRegistry.add(gameId, socket);
            sendWebSocketMessage(socket, { type: 'LOBBY_STATE', payload: snapshot });
        }
        catch (error) {
            sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: error.message } });
            socket.close();
        }
    };
    if (wss) {
        wss.on('connection', (socket, request) => {
            handleWebSocketConnection(socket, request.url ?? null);
            socket.on('close', () => {
                wssRegistry.remove(socket);
            });
        });
    }
    const handleSocketIoConnection = (socket) => {
        const gameId = parseQueryParam(socket.handshake.query.gameId);
        const playerId = parseQueryParam(socket.handshake.query.playerId);
        if (!gameId || !playerId) {
            buildSocketError(socket, 'gameId and playerId are required');
            return;
        }
        try {
            const snapshot = game_1.lobbySessionManager.fetchLobby(gameId);
            const hasPlayer = snapshot.players.some((player) => player.id === playerId);
            if (!hasPlayer) {
                buildSocketError(socket, 'Player not registered in this lobby');
                return;
            }
            ioRegistry.add(gameId, socket);
            socket.emit('realtime_message', { type: 'LOBBY_STATE', payload: snapshot });
        }
        catch (error) {
            buildSocketError(socket, error.message);
        }
        socket.on('disconnect', () => {
            ioRegistry.remove(socket);
        });
    };
    if (lobbyNamespace) {
        lobbyNamespace.on('connection', handleSocketIoConnection);
    }
    const stop = () => {
        game_1.lobbySessionManager.off('lobby-updated', lobbyListener);
        game_1.lobbySessionManager.off('game-started', gameStartedListener);
        wss?.close();
        if (lobbyNamespace) {
            lobbyNamespace.off('connection', handleSocketIoConnection);
        }
    };
    const getStats = () => {
        const activeGames = (0, health_1.countActiveGamesAcrossRooms)(wssRegistry.rooms, ioRegistry.rooms);
        const activeConnections = (0, health_1.countConnections)(wssRegistry.rooms) + (0, health_1.countConnections)(ioRegistry.rooms);
        return {
            activeGames,
            activeConnections,
            lastBroadcastAt
        };
    };
    return { stop, getStats };
};
exports.startLobbyRealtime = startLobbyRealtime;
