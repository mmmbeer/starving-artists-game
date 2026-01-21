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
exports.registerLobbySocketHandlers = registerLobbySocketHandlers;
const lobbyManager = __importStar(require("../services/lobby/lobbyManager"));
const playerManager = __importStar(require("../services/lobby/playerManager"));
function registerLobbySocketHandlers(io) {
    io.on('connection', (socket) => {
        // Join lobby room
        socket.on('join-lobby', async (data) => {
            try {
                const { gameId, playerId } = data;
                // Register player connection
                playerManager.registerPlayer(socket.id, playerId, gameId);
                // Join socket room
                socket.join(`lobby:${gameId}`);
                // Get current lobby state
                const lobbyInfo = await lobbyManager.getLobbyInfo(gameId);
                // Send current state to joining player
                socket.emit('lobby-state', lobbyInfo);
                // Notify other players
                socket.to(`lobby:${gameId}`).emit('player-joined', {
                    player: lobbyInfo.players.find(p => p.id === playerId),
                    playerCount: lobbyInfo.players.length,
                });
            }
            catch (error) {
                console.error('Join lobby error:', error);
                socket.emit('error', { message: 'Failed to join lobby' });
            }
        });
        // Leave lobby
        socket.on('leave-lobby', async (data) => {
            try {
                const { gameId, playerId } = data;
                const lobbyInfo = await lobbyManager.leaveLobby(gameId, playerId);
                socket.leave(`lobby:${gameId}`);
                playerManager.unregisterPlayer(socket.id);
                if (lobbyInfo) {
                    // Notify remaining players
                    io.to(`lobby:${gameId}`).emit('player-left', {
                        playerId,
                        playerCount: lobbyInfo.players.length,
                    });
                    // Send updated state
                    io.to(`lobby:${gameId}`).emit('lobby-state', lobbyInfo);
                }
                else {
                    // Lobby was deleted
                    io.to(`lobby:${gameId}`).emit('lobby-closed');
                }
            }
            catch (error) {
                console.error('Leave lobby error:', error);
                socket.emit('error', { message: 'Failed to leave lobby' });
            }
        });
        // Request lobby state update
        socket.on('request-lobby-state', async (data) => {
            try {
                const { gameId } = data;
                const lobbyInfo = await lobbyManager.getLobbyInfo(gameId);
                socket.emit('lobby-state', lobbyInfo);
            }
            catch (error) {
                console.error('Request lobby state error:', error);
                socket.emit('error', { message: 'Failed to get lobby state' });
            }
        });
        // Player ready/unready (optional feature)
        socket.on('player-ready', (data) => {
            const { gameId, playerId, ready } = data;
            socket.to(`lobby:${gameId}`).emit('player-ready-changed', {
                playerId,
                ready,
            });
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            const connection = playerManager.unregisterPlayer(socket.id);
            if (connection) {
                socket.to(`lobby:${connection.gameId}`).emit('player-disconnected', {
                    playerId: connection.playerId,
                });
            }
        });
    });
}
