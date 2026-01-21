"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
// Express application setup
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const compression_1 = __importDefault(require("compression"));
const env_1 = require("./config/env");
function createApp() {
    const app = (0, express_1.default)();
    // View engine setup
    app.set('views', path_1.default.join(__dirname, '..', 'views'));
    app.set('view engine', 'ejs');
    // Middleware
    app.use((0, compression_1.default)());
    app.use(body_parser_1.default.json());
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, express_session_1.default)({
        secret: env_1.config.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: env_1.config.nodeEnv === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    }));
    // Static files
    app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
    // Health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // Import routes
    const indexRoutes = require('./routes/index.routes').default;
    const lobbyRoutes = require('./routes/lobby.routes').default;
    const gameRoutes = require('./routes/game.routes').default;
    // Register routes
    app.use('/', indexRoutes);
    app.use('/lobby', lobbyRoutes);
    app.use('/game', gameRoutes);
    // 404 handler
    app.use((_req, res) => {
        res.status(404).render('pages/404', { title: 'Page Not Found' });
    });
    // Error handler
    app.use((err, _req, res, _next) => {
        console.error('Error:', err);
        res.status(500).render('pages/error', {
            title: 'Error',
            message: env_1.config.nodeEnv === 'development' ? err.message : 'Something went wrong',
            error: env_1.config.nodeEnv === 'development' ? err : {},
        });
    });
    return app;
}
