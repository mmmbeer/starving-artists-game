// Application entry point
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config/env';

const app = createApp();
const server = http.createServer(app);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Configure properly for production
    methods: ['GET', 'POST'],
  },
  path: '/socket.io',
});

// Register Socket.IO handlers
import { registerLobbySocketHandlers } from './socket/lobby.socket';
import { registerGameSocketHandlers } from './socket/game.socket';

registerLobbySocketHandlers(io);
registerGameSocketHandlers(io);

// Make io available globally for routes
app.set('io', io);

// Game state remains in-memory; canvas definitions load from MySQL
console.log('Using in-memory game state; canvas definitions load from MySQL');

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`URL: http://localhost:${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
