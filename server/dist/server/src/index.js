"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Application entry point
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = require("./app");
const env_1 = require("./config/env");
const app = (0, app_1.createApp)();
const server = http_1.default.createServer(app);
// Socket.IO setup
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Configure properly for production
        methods: ['GET', 'POST'],
    },
    path: '/socket.io',
});
// Register Socket.IO handlers
const lobby_socket_1 = require("./socket/lobby.socket");
const game_socket_1 = require("./socket/game.socket");
(0, lobby_socket_1.registerLobbySocketHandlers)(io);
(0, game_socket_1.registerGameSocketHandlers)(io);
// Make io available globally for routes
app.set('io', io);
// Using in-memory database - no connection test needed
console.log('Using in-memory database for development');
// Start server
server.listen(env_1.config.port, () => {
    console.log(`Server running on port ${env_1.config.port}`);
    console.log(`Environment: ${env_1.config.nodeEnv}`);
    console.log(`URL: http://localhost:${env_1.config.port}`);
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
