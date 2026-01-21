"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Lobby routes
const express_1 = require("express");
const lobbyManager = __importStar(require("../services/lobby/lobbyManager"));
const gameEngine = __importStar(require("../services/game/gameEngine"));
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Create new game lobby
router.post('/create', async (req, res) => {
    try {
        const { playerName } = req.body;
        if (!playerName || !(0, validation_1.isValidPlayerName)(playerName)) {
            return res.status(400).json({
                error: 'Invalid player name. Must be 2-50 characters, alphanumeric.',
            });
        }
        const lobbyInfo = await lobbyManager.createLobby(playerName);
        // Store player ID in session
        req.session.playerId = lobbyInfo.players[0].id;
        req.session.gameId = lobbyInfo.game.id;
        res.json({
            success: true,
            gameId: lobbyInfo.game.id,
            playerId: lobbyInfo.players[0].id,
            redirectUrl: `/lobby/${lobbyInfo.game.id}`,
        });
    }
    catch (error) {
        console.error('Create lobby error:', error);
        res.status(500).json({ error: 'Failed to create lobby' });
    }
});
// Join existing game lobby
router.post('/join/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { playerName } = req.body;
        if (!playerName || !(0, validation_1.isValidPlayerName)(playerName)) {
            return res.status(400).json({
                error: 'Invalid player name. Must be 2-50 characters, alphanumeric.',
            });
        }
        const lobbyInfo = await lobbyManager.joinLobby(gameId, playerName);
        const newPlayer = lobbyInfo.players.find(p => p.name === (0, validation_1.sanitizePlayerName)(playerName));
        if (!newPlayer) {
            return res.status(500).json({ error: 'Failed to join lobby' });
        }
        // Store player ID in session
        req.session.playerId = newPlayer.id;
        req.session.gameId = gameId;
        res.json({
            success: true,
            gameId,
            playerId: newPlayer.id,
            redirectUrl: `/lobby/${gameId}`,
        });
    }
    catch (error) {
        console.error('Join lobby error:', error);
        res.status(400).json({ error: error.message || 'Failed to join lobby' });
    }
});
// Get lobby page
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const playerId = req.session.playerId;
        const lobbyInfo = await lobbyManager.getLobbyInfo(gameId);
        const player = lobbyInfo.players.find(p => p.id === playerId);
        res.render('pages/lobby', {
            title: 'Game Lobby - Starving Artists',
            game: lobbyInfo.game,
            players: lobbyInfo.players,
            currentPlayer: player || null,
            canStart: lobbyInfo.canStart,
            isHost: player?.is_host || false,
        });
    }
    catch (error) {
        console.error('Get lobby error:', error);
        res.status(404).render('pages/error', {
            title: 'Error',
            message: 'Game not found',
        });
    }
});
// Start game
router.post('/:gameId/start', async (req, res) => {
    try {
        const { gameId } = req.params;
        const playerId = req.session.playerId;
        if (!playerId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const canStart = await lobbyManager.canStartGame(gameId, playerId);
        if (!canStart) {
            return res.status(403).json({ error: 'Cannot start game' });
        }
        await gameEngine.startGame(gameId);
        res.json({
            success: true,
            redirectUrl: `/game/${gameId}`,
        });
    }
    catch (error) {
        console.error('Start game error:', error);
        res.status(400).json({ error: error.message || 'Failed to start game' });
    }
});
// Leave lobby
router.post('/:gameId/leave', async (req, res) => {
    try {
        const { gameId } = req.params;
        const playerId = req.session.playerId;
        if (!playerId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        await lobbyManager.leaveLobby(gameId, playerId);
        // Clear session
        req.session.playerId = undefined;
        req.session.gameId = undefined;
        res.json({ success: true, redirectUrl: '/' });
    }
    catch (error) {
        console.error('Leave lobby error:', error);
        res.status(400).json({ error: error.message || 'Failed to leave lobby' });
    }
});
exports.default = router;
