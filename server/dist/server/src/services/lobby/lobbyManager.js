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
exports.createLobby = createLobby;
exports.joinLobby = joinLobby;
exports.leaveLobby = leaveLobby;
exports.getLobbyInfo = getLobbyInfo;
exports.canStartGame = canStartGame;
// Lobby management service
const gameDb = __importStar(require("../database/gameDb"));
const playerDb = __importStar(require("../database/playerDb"));
const validation_1 = require("../utils/validation");
async function createLobby(playerName) {
    const sanitizedName = (0, validation_1.sanitizePlayerName)(playerName);
    // Create player first to get ID for host
    const tempPlayerId = 'temp';
    const game = await gameDb.createGame(tempPlayerId);
    // Create host player
    const player = await playerDb.createPlayer(game.id, sanitizedName, 0, true);
    // Update game with actual host player ID
    await gameDb.updateCurrentPlayer(game.id, player.id);
    const updatedGame = await gameDb.getGame(game.id);
    if (!updatedGame)
        throw new Error('Failed to create lobby');
    return {
        game: updatedGame,
        players: [player],
        canStart: false, // Need at least 2 players
    };
}
async function joinLobby(gameId, playerName) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    if (game.status !== 'lobby') {
        throw new Error('Game has already started');
    }
    const existingPlayers = await playerDb.getGamePlayers(gameId);
    if (existingPlayers.length >= 4) {
        throw new Error('Game is full (maximum 4 players)');
    }
    const sanitizedName = (0, validation_1.sanitizePlayerName)(playerName);
    // Check for duplicate names
    const nameExists = existingPlayers.some(p => p.name.toLowerCase() === sanitizedName.toLowerCase());
    if (nameExists) {
        throw new Error('Player name already taken');
    }
    // Create new player with next turn order
    const turnOrder = existingPlayers.length;
    const player = await playerDb.createPlayer(gameId, sanitizedName, turnOrder, false);
    const allPlayers = await playerDb.getGamePlayers(gameId);
    return {
        game,
        players: allPlayers,
        canStart: allPlayers.length >= 2,
    };
}
async function leaveLobby(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    const player = await playerDb.getPlayer(playerId);
    if (!player)
        throw new Error('Player not found');
    const players = await playerDb.getGamePlayers(gameId);
    // If player is host and game hasn't started, delete the game
    if (player.is_host && game.status === 'lobby') {
        await gameDb.deleteGame(gameId);
        return null;
    }
    // Remove player
    await playerDb.deletePlayer(playerId);
    const remainingPlayers = await playerDb.getGamePlayers(gameId);
    // If no players left, delete game
    if (remainingPlayers.length === 0) {
        await gameDb.deleteGame(gameId);
        return null;
    }
    return {
        game,
        players: remainingPlayers,
        canStart: remainingPlayers.length >= 2,
    };
}
async function getLobbyInfo(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    const players = await playerDb.getGamePlayers(gameId);
    return {
        game,
        players,
        canStart: players.length >= 2 && game.status === 'lobby',
    };
}
async function canStartGame(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    if (!game || game.status !== 'lobby')
        return false;
    const player = await playerDb.getPlayer(playerId);
    if (!player || !player.is_host)
        return false;
    const players = await playerDb.getGamePlayers(gameId);
    return players.length >= 2 && players.length <= 4;
}
