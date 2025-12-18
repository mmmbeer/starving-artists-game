import { createApp } from './app';
import { initDbPool } from './db/pool';
import { getConfig } from './config/env';
import { startLobbyRealtime } from './realtime/lobbyRealtime';
import { startGameRealtime } from './realtime/gameRealtime';

const config = getConfig();
initDbPool();

const app = createApp();
const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${config.port}`);
});

const { stop: stopLobbyRealtime } = startLobbyRealtime(server);
const { stop: stopGameRealtime } = startGameRealtime(server);

const gracefulShutdown = async () => {
  // eslint-disable-next-line no-console
  console.log('Shutting down server');
  stopLobbyRealtime();
  stopGameRealtime();
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
