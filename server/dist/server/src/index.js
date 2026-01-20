"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const pool_1 = require("./db/pool");
const env_1 = require("./config/env");
const lobbyRealtime_1 = require("./realtime/lobbyRealtime");
const gameRealtime_1 = require("./realtime/gameRealtime");
const health_1 = require("./realtime/health");
const socket_io_1 = require("socket.io");
const origins_1 = require("./config/origins");
const config = (0, env_1.getConfig)();
(0, pool_1.initDbPool)();
const app = (0, app_1.createApp)();
const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${config.port}`);
});
const socketIoServer = config.realtime.enableSocketIo
    ? new socket_io_1.Server(server, {
        cors: {
            origin: (0, origins_1.getAllowedOrigins)(),
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: config.realtime.socketIoPath
    })
    : null;
const { stop: stopLobbyRealtime, getStats: getLobbyHealth } = (0, lobbyRealtime_1.startLobbyRealtime)(server, config.realtime, socketIoServer);
const { stop: stopGameRealtime, getStats: getGameHealth } = (0, gameRealtime_1.startGameRealtime)(server, config.realtime, socketIoServer);
(0, health_1.setRealtimeHealthProviders)(getLobbyHealth, getGameHealth);
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
