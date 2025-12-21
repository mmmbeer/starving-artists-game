import { createApp } from './app';
import { initDbPool } from './db/pool';
import { getConfig } from './config/env';
import { startLobbyRealtime } from './realtime/lobbyRealtime';
import { startGameRealtime } from './realtime/gameRealtime';
import { getRealtimeHealth, setRealtimeHealthProviders } from './realtime/health';
import { Server as SocketIOServer } from 'socket.io';
import { getAllowedOrigins } from './config/origins';

const config = getConfig();
initDbPool();

const app = createApp();
const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${config.port}`);
});

const socketIoServer = config.realtime.enableSocketIo
  ? new SocketIOServer(server, {
      cors: {
        origin: getAllowedOrigins(),
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: config.realtime.socketIoPath
    })
  : null;

const { stop: stopLobbyRealtime, getStats: getLobbyHealth } = startLobbyRealtime(
  server,
  config.realtime,
  socketIoServer
);
const { stop: stopGameRealtime, getStats: getGameHealth } = startGameRealtime(
  server,
  config.realtime,
  socketIoServer
);
setRealtimeHealthProviders(getLobbyHealth, getGameHealth);

const gracefulShutdown = async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down server');
  stopLobbyRealtime();
  stopGameRealtime();
  socketIoServer?.close();
  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Error during shutdown', err);
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
