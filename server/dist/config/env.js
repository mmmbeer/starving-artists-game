"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// Environment configuration
const dotenv_1 = __importDefault(require("dotenv"));
// Try to load .env from server directory first, then root
dotenv_1.default.config({ path: '.env' });
dotenv_1.default.config({ path: '../.env' });
// Database vars are now optional since we use in-memory store
exports.config = {
    port: parseInt(process.env.PORT || '8001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'starving-artists-secret-key-change-in-production',
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'starving_artists',
        port: parseInt(process.env.DB_PORT || '3306', 10),
    },
};
