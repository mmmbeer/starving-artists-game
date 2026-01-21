// Lobby Socket.IO events
import { Server as SocketIOServer, Socket } from 'socket.io';
import * as lobbyManager from '../services/lobby/lobbyManager';
import * as playerManager from '../services/lobby/playerManager';

export function registerLobbySocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    // Join lobby room
    socket.on('join-lobby', async (data: { gameId: string; playerId: string }) => {
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
      } catch (error) {
        console.error('Join lobby error:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });
    
    // Leave lobby
    socket.on('leave-lobby', async (data: { gameId: string; playerId: string }) => {
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
        } else {
          // Lobby was deleted
          io.to(`lobby:${gameId}`).emit('lobby-closed');
        }
      } catch (error) {
        console.error('Leave lobby error:', error);
        socket.emit('error', { message: 'Failed to leave lobby' });
      }
    });
    
    // Request lobby state update
    socket.on('request-lobby-state', async (data: { gameId: string }) => {
      try {
        const { gameId } = data;
        const lobbyInfo = await lobbyManager.getLobbyInfo(gameId);
        socket.emit('lobby-state', lobbyInfo);
      } catch (error) {
        console.error('Request lobby state error:', error);
        socket.emit('error', { message: 'Failed to get lobby state' });
      }
    });
    
    // Player ready/unready (optional feature)
    socket.on('player-ready', (data: { gameId: string; playerId: string; ready: boolean }) => {
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
