// Game Socket.IO events
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as gameEngine from '../services/game/gameEngine';
import * as actionHandler from '../services/game/actionHandler';
import * as sellingPhase from '../services/game/sellingPhase';
import * as playerManager from '../services/lobby/playerManager';

export function registerGameSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // Join game room
    socket.on('join-game', async (data: { gameId: string; playerId: string }) => {
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
      } catch (error) {
        console.error('Join game error:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });
    
    // Work action
    socket.on('action:work', async (data: { gameId: string; playerId: string }) => {
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
      } catch (error: any) {
        console.error('Work action error:', error);
        socket.emit('action-error', { message: error.message });
      }
    });
    
    // Buy canvas action
    socket.on('action:buy-canvas', async (data: { gameId: string; playerId: string; slotIndex: number }) => {
      try {
        const { gameId, playerId, slotIndex } = data;
        
        const gameState = await actionHandler.performBuyCanvasAction(
          gameId,
          playerId,
          slotIndex
        );
        
        // Broadcast updated state
        io.to(`game:${gameId}`).emit('game-state', gameState);
        io.to(`game:${gameId}`).emit('action-performed', {
          action: 'buy-canvas',
          playerId,
          slotIndex,
        });
      } catch (error: any) {
        console.error('Buy canvas error:', error);
        socket.emit('action-error', { message: error.message });
      }
    });
    
    // Paint action
    socket.on('action:paint', async (data: { 
      gameId: string; 
      playerId: string; 
      paintings: Array<{ canvasId: string; squareId: string; cubeId: string }>
    }) => {
      try {
        const { gameId, playerId, paintings } = data;
        
        const gameState = await actionHandler.performPaintAction(
          gameId,
          playerId,
          paintings
        );
        
        // Broadcast updated state
        io.to(`game:${gameId}`).emit('game-state', gameState);
        io.to(`game:${gameId}`).emit('action-performed', {
          action: 'paint',
          playerId,
          paintingsCount: paintings.length,
        });
        
        // Check if game ended
        if (gameState.game.status === 'finished') {
          io.to(`game:${gameId}`).emit('game-ended', {
            winner: gameState.players.find(p => p.id === gameState.game.winner_id),
            finalScores: gameState.players,
          });
        }
      } catch (error: any) {
        console.error('Paint action error:', error);
        socket.emit('action-error', { message: error.message });
      }
    });
    
    // End turn action
    socket.on('action:end-turn', async (data: { gameId: string; playerId: string }) => {
      try {
        const { gameId, playerId } = data;
        
        const gameState = await actionHandler.performEndTurnAction(gameId, playerId);
        
        // Broadcast updated state
        io.to(`game:${gameId}`).emit('game-state', gameState);
        io.to(`game:${gameId}`).emit('turn-changed', {
          currentPlayerId: gameState.game.current_player_id,
          currentPhase: gameState.game.current_phase,
        });
      } catch (error: any) {
        console.error('End turn error:', error);
        socket.emit('action-error', { message: error.message });
      }
    });
    
    // Selling phase - submit sell intent
    socket.on('action:sell', async (data: { gameId: string; playerId: string; canvasIds: string[] }) => {
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
      } catch (error: any) {
        console.error('Sell action error:', error);
        socket.emit('action-error', { message: error.message });
      }
    });
    
    // Request current game state
    socket.on('request-game-state', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;
        const gameState = await gameEngine.getFullGameState(gameId);
        socket.emit('game-state', gameState);
      } catch (error) {
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
