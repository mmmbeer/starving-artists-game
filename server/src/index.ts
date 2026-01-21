// Application entry point
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { config } from './config/env';
import { getPool, closePool } from './config/database';

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

// Test database connection
getPool()
  .getConnection()
  .then((connection) => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
});
