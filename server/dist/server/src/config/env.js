"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const parseBoolean = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const normalized = value.toLowerCase();
    return normalized !== 'false' && normalized !== '0';
};
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PORT', 'DB_PASSWORD', 'DB_NAME'];
for (const envVar of requiredEnv) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
const getConfig = () => {
    const port = Number(process.env.PORT ?? 4000);
    if (Number.isNaN(port)) {
        throw new Error('PORT must be a valid number');
    }
    const realtime = {
        // Socket.IO is primary for shared hosting compatibility
        enableSocketIo: parseBoolean(process.env.REALTIME_SOCKET_IO_ENABLED, true),
        enableWebSocket: parseBoolean(process.env.REALTIME_WSS_ENABLED, true),
        // Standard Socket.IO path for better Apache/shared hosting support
        socketIoPath: process.env.SOCKET_IO_PATH ?? '/socket.io'
    };
    return {
        port,
        database: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME
        },
        realtime
    };
};
exports.getConfig = getConfig;
