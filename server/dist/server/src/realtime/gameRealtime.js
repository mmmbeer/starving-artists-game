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
exports.startGameRealtime = void 0;
const ws_1 = __importStar(require("ws"));
const game_1 = require("../game");
const health_1 = require("./health");
const roomRegistry_1 = require("./roomRegistry");
const ROOM_PATH = '/realtime/game';
const sendWebSocketMessage = (socket, message) => {
    if (socket.readyState === ws_1.default.OPEN) {
        socket.send(JSON.stringify(message));
    }
};
const sendSocketIoMessage = (socket, message) => {
    socket.emit('realtime_message', message);
};
const assertNever = (value) => {
    throw new Error(`Unhandled action intent ${JSON.stringify(value)}`);
};
const buildGameAction = (intent, playerId) => {
    switch (intent.type) {
        case 'DRAW_PAINT_CUBES':
            return { type: 'DRAW_PAINT_CUBES', payload: { playerId, count: intent.payload.count } };
        case 'BUY_CANVAS':
            return { type: 'BUY_CANVAS', payload: { playerId, slotIndex: intent.payload.slotIndex } };
        case 'APPLY_PAINT_TO_CANVAS':
            return {
                type: 'APPLY_PAINT_TO_CANVAS',
                payload: {
                    playerId,
                    canvasId: intent.payload.canvasId,
                    squareId: intent.payload.squareId,
                    cubeId: intent.payload.cubeId
                }
            };
        case 'END_TURN':
            return { type: 'END_TURN', payload: { playerId } };
        case 'DECLARE_SELL_INTENT':
            return { type: 'DECLARE_SELL_INTENT', payload: { playerId, canvasIds: intent.payload.canvasIds } };
        default:
            return assertNever(intent);
    }
};
const parseQueryParam = (value) => {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value ?? null;
};
const handleSocketIoError = (socket, message) => {
    sendSocketIoMessage(socket, { type: 'ERROR', payload: { message } });
    socket.disconnect(true);
};
const startGameRealtime = (server, realtimeConfig, socketIoServer) => {
    const websocketRegistry = (0, roomRegistry_1.createRoomRegistry)();
    const socketIoRegistry = (0, roomRegistry_1.createRoomRegistry)();
    let lastBroadcastAt = null;
    const wss = realtimeConfig.enableWebSocket
        ? new ws_1.WebSocketServer({
            server,
            path: ROOM_PATH
        })
        : null;
    const gameNamespace = realtimeConfig.enableSocketIo && socketIoServer ? socketIoServer.of('/game') : null;
    if (realtimeConfig.enableSocketIo && !socketIoServer) {
        throw new Error('Socket.IO server required when socket.io realtime is enabled');
    }
    const broadcastToWebSockets = (gameId, message) => {
        const sockets = websocketRegistry.rooms.get(gameId);
        if (!sockets) {
            return;
        }
        sockets.forEach((socket) => sendWebSocketMessage(socket, message));
    };
    const broadcastToSocketIo = (gameId, message) => {
        const sockets = socketIoRegistry.rooms.get(gameId);
        if (!sockets) {
            return;
        }
        sockets.forEach((socket) => sendSocketIoMessage(socket, message));
    };
    const broadcast = (gameId, message) => {
        broadcastToWebSockets(gameId, message);
        broadcastToSocketIo(gameId, message);
        lastBroadcastAt = new Date().toISOString();
    };
    const gameStateListener = (event) => {
        broadcast(event.gameId, {
            type: 'GAME_STATE_UPDATED',
            payload: {
                state: event.state,
                lastAction: event.action
            }
        });
    };
    game_1.lobbySessionManager.on('game-state-updated', gameStateListener);
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
            const hasSession = game_1.lobbySessionManager.hasSession(gameId);
            if (!hasSession || !game_1.lobbySessionManager.isPlayerInGame(gameId, playerId)) {
                sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'Player not registered for this game' } });
                socket.close();
                return;
            }
            websocketRegistry.add(gameId, socket);
            const state = game_1.lobbySessionManager.fetchGameState(gameId);
            sendWebSocketMessage(socket, {
                type: 'GAME_STATE_UPDATED',
                payload: {
                    state
                }
            });
        }
        catch (error) {
            sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: error.message } });
            socket.close();
            return;
        }
        socket.on('message', (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                if (data.type !== 'GAME_ACTION') {
                    return;
                }
                try {
                    const action = buildGameAction(data.payload, playerId);
                    game_1.lobbySessionManager.applyAction(gameId, action, playerId);
                }
                catch (actionError) {
                    sendWebSocketMessage(socket, {
                        type: 'ERROR',
                        payload: { message: actionError.message }
                    });
                }
            }
            catch {
                sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'Invalid message format' } });
            }
        });
        socket.on('close', () => {
            websocketRegistry.remove(socket);
        });
    };
    if (wss) {
        wss.on('connection', (socket, request) => {
            handleWebSocketConnection(socket, request.url ?? null);
        });
    }
    const handleSocketIoConnection = (socket) => {
        const gameId = parseQueryParam(socket.handshake.query.gameId);
        const playerId = parseQueryParam(socket.handshake.query.playerId);
        if (!gameId || !playerId) {
            handleSocketIoError(socket, 'gameId and playerId are required');
            return;
        }
        try {
            const hasSession = game_1.lobbySessionManager.hasSession(gameId);
            if (!hasSession || !game_1.lobbySessionManager.isPlayerInGame(gameId, playerId)) {
                handleSocketIoError(socket, 'Player not registered for this game');
                return;
            }
            socketIoRegistry.add(gameId, socket);
            const state = game_1.lobbySessionManager.fetchGameState(gameId);
            sendSocketIoMessage(socket, {
                type: 'GAME_STATE_UPDATED',
                payload: {
                    state
                }
            });
        }
        catch (error) {
            handleSocketIoError(socket, error.message);
            return;
        }
        socket.on('game_action', (data) => {
            if (data.type !== 'GAME_ACTION') {
                return;
            }
            try {
                const action = buildGameAction(data.payload, playerId);
                game_1.lobbySessionManager.applyAction(gameId, action, playerId);
            }
            catch (actionError) {
                sendSocketIoMessage(socket, {
                    type: 'ERROR',
                    payload: { message: actionError.message }
                });
            }
        });
        socket.on('disconnect', () => {
            socketIoRegistry.remove(socket);
        });
    };
    if (gameNamespace) {
        gameNamespace.on('connection', handleSocketIoConnection);
    }
    const stop = () => {
        game_1.lobbySessionManager.off('game-state-updated', gameStateListener);
        wss?.close();
        if (gameNamespace) {
            gameNamespace.off('connection', handleSocketIoConnection);
        }
    };
    const getStats = () => {
        const activeGames = (0, health_1.countActiveGamesAcrossRooms)(websocketRegistry.rooms, socketIoRegistry.rooms);
        const activeConnections = (0, health_1.countConnections)(websocketRegistry.rooms) + (0, health_1.countConnections)(socketIoRegistry.rooms);
        return {
            activeGames,
            activeConnections,
            lastBroadcastAt
        };
    };
    return { stop, getStats };
};
exports.startGameRealtime = startGameRealtime;
