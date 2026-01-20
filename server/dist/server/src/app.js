"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lobbyRoutes_1 = __importDefault(require("./lobby/lobbyRoutes"));
const health_1 = require("./realtime/health");
const origins_1 = require("./config/origins");
const allowedOrigins = (0, origins_1.getAllowedOrigins)();
const applyCorsHeaders = (req, res) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
};
const clientDistCandidates = [
    path_1.default.resolve(__dirname, '..', '..', '..', '..', 'client', 'dist'),
    path_1.default.resolve(__dirname, '..', '..', 'client', 'dist'),
];
const clientDist = clientDistCandidates.find((candidate) => fs_1.default.existsSync(candidate));
if (!clientDist) {
    throw new Error(`client dist directory not found; checked ${clientDistCandidates.join(', ')}`);
}
const createApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use((req, res, next) => {
        applyCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.sendStatus(204);
            return;
        }
        next();
    });
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    app.get('/realtime/health', (_req, res) => {
        res.status(200).json((0, health_1.getRealtimeHealth)());
    });
    app.use('/api/lobby', lobbyRoutes_1.default);
    app.use(express_1.default.static(clientDist));
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(clientDist, 'index.html'));
    });
    return app;
};
exports.createApp = createApp;
exports.default = exports.createApp;
