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
exports.registerGameSocketHandlers = registerGameSocketHandlers;
const gameEngine = __importStar(require("../services/game/gameEngine"));
const actionHandler = __importStar(require("../services/game/actionHandler"));
const playerManager = __importStar(require("../services/lobby/playerManager"));
function registerGameSocketHandlers(io) {
    io.on('connection', (socket) => {
        // Join game room
        socket.on('join-game', async (data) => {
            try {
                const { gameId, playerId } = data;
                // Register player connection
                playerManager.registerPlayer(socket.id, playerId, gameId);
                // Join socket room
                socket.join(`game:${gameId}`);
                // Get current game state
                const gameState = await gameEngine.getFullGameState(gameId);
                // Send current state to joining player
                socket.emit('game-state', gameState);
                // Notify other players
                socket.to(`game:${gameId}`).emit('player-connected', {
                    playerId,
                });
            }
            catch (error) {
                console.error('Join game error:', error);
                socket.emit('error', { message: 'Failed to join game' });
            }
        });
        // Work action
        socket.on('action:work', async (data) => {
            try {
                const { gameId, playerId } = data;
                const gameState = await actionHandler.performWorkAction(gameId, playerId);
                // Broadcast updated state to all players
                io.to(`game:${gameId}`).emit('game-state', gameState);
                io.to(`game:${gameId}`).emit('action-performed', {
                    action: 'work',
                    playerId,
                    cubesDrawn: 3,
                });
            }
            catch (error) {
                console.error('Work action error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Buy canvas action
        socket.on('action:buy-canvas', async (data) => {
            try {
                const { gameId, playerId, slotIndex } = data;
                const gameState = await actionHandler.performBuyCanvasAction(gameId, playerId, slotIndex);
                // Broadcast updated state
                io.to(`game:${gameId}`).emit('game-state', gameState);
                io.to(`game:${gameId}`).emit('action-performed', {
                    action: 'buy-canvas',
                    playerId,
                    slotIndex,
                });
            }
            catch (error) {
                console.error('Buy canvas error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Paint action
        socket.on('action:paint', async (data) => {
            try {
                const { gameId, playerId, paintings } = data;
                const result = await actionHandler.performPaintAction(gameId, playerId, paintings);
                // Broadcast updated state
                io.to(`game:${gameId}`).emit('game-state', result.gameState);
                io.to(`game:${gameId}`).emit('action-performed', {
                    action: 'paint',
                    playerId,
                    paintingsCount: paintings.length,
                    completions: result.completions,
                });
                // Check if game ended
                if (result.gameState.game.status === 'finished') {
                    io.to(`game:${gameId}`).emit('game-ended', {
                        winner: result.gameState.players.find((p) => p.id === result.gameState.game.winner_id),
                        finalScores: result.gameState.players,
                    });
                }
            }
            catch (error) {
                console.error('Paint action error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // End turn action
        socket.on('action:end-turn', async (data) => {
            try {
                const { gameId, playerId } = data;
                const result = await actionHandler.performEndTurnAction(gameId, playerId);
                // Broadcast updated state
                io.to(`game:${gameId}`).emit('game-state', result.gameState);
                io.to(`game:${gameId}`).emit('turn-changed', {
                    currentPlayerId: result.gameState.game.current_player_id,
                    currentPhase: result.gameState.game.current_phase,
                });
                // If phase changed, notify
                if (result.phaseResult) {
                    io.to(`game:${gameId}`).emit('phase-changed', result.phaseResult);
                }
            }
            catch (error) {
                console.error('End turn error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Collect paint during selling phase
        socket.on('action:collect-paint', async (data) => {
            try {
                const { gameId, playerId, cubeIds } = data;
                const result = await actionHandler.performCollectPaintAction(gameId, playerId, cubeIds);
                // Broadcast updated state
                io.to(`game:${gameId}`).emit('game-state', result.gameState);
                io.to(`game:${gameId}`).emit('action-performed', {
                    action: 'collect-paint',
                    playerId,
                    cubesCollected: result.cubesCollected.length,
                });
                if (result.sellingComplete) {
                    io.to(`game:${gameId}`).emit('selling-complete', { gameId });
                }
            }
            catch (error) {
                console.error('Collect paint error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Skip collection during selling phase
        socket.on('action:skip-collection', async (data) => {
            try {
                const { gameId, playerId } = data;
                const result = await actionHandler.performSkipCollectionAction(gameId, playerId);
                // Broadcast updated state
                io.to(`game:${gameId}`).emit('game-state', result.gameState);
                io.to(`game:${gameId}`).emit('action-performed', {
                    action: 'skip-collection',
                    playerId,
                });
                if (result.sellingComplete) {
                    io.to(`game:${gameId}`).emit('selling-complete', { gameId });
                }
            }
            catch (error) {
                console.error('Skip collection error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Selling phase - submit sell intent (legacy)
        socket.on('action:sell', async (data) => {
            try {
                const { gameId, playerId, canvasIds } = data;
                // Store sell intent (in a real implementation, we'd need a temporary store)
                // For now, emit to all players that this player submitted
                socket.to(`game:${gameId}`).emit('sell-intent-submitted', {
                    playerId,
                    canvasCount: canvasIds.length,
                });
                socket.emit('sell-intent-confirmed', {
                    canvasIds,
                });
            }
            catch (error) {
                console.error('Sell action error:', error);
                socket.emit('action-error', { message: error.message });
            }
        });
        // Request current game state
        socket.on('request-game-state', async (data) => {
            try {
                const { gameId } = data;
                const gameState = await gameEngine.getFullGameState(gameId);
                socket.emit('game-state', gameState);
            }
            catch (error) {
                console.error('Request game state error:', error);
                socket.emit('error', { message: 'Failed to get game state' });
            }
        });
        // Ping for connection keep-alive
        socket.on('ping', () => {
            playerManager.updatePing(socket.id);
            socket.emit('pong');
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            const connection = playerManager.unregisterPlayer(socket.id);
            if (connection) {
                socket.to(`game:${connection.gameId}`).emit('player-disconnected', {
                    playerId: connection.playerId,
                });
            }
        });
    });
}
