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
exports.initializeTurnOrder = initializeTurnOrder;
exports.getNextPlayer = getNextPlayer;
exports.advanceToNextPlayer = advanceToNextPlayer;
exports.advancePhase = advancePhase;
exports.canPlayerAct = canPlayerAct;
exports.decrementAllNutrition = decrementAllNutrition;
exports.checkStarvation = checkStarvation;
exports.hasActionAvailable = hasActionAvailable;
// Turn management service
const gameDb = __importStar(require("../database/gameDb"));
const playerDb = __importStar(require("../database/playerDb"));
const constants_1 = require("../utils/constants");
async function initializeTurnOrder(gameId, players) {
    if (players.length === 0)
        return;
    // First player in turn order starts
    const firstPlayer = players[0];
    await gameDb.updateCurrentPlayer(gameId, firstPlayer.id);
    await gameDb.updateGamePhase(gameId, 'morning');
}
async function getNextPlayer(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    const game = await gameDb.getGame(gameId);
    if (!game || !game.current_player_id || players.length === 0) {
        return null;
    }
    const currentIndex = players.findIndex(p => p.id === game.current_player_id);
    if (currentIndex === -1)
        return players[0];
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex];
}
async function advanceToNextPlayer(gameId) {
    const nextPlayer = await getNextPlayer(gameId);
    if (!nextPlayer)
        throw new Error('No next player found');
    await gameDb.updateCurrentPlayer(gameId, nextPlayer.id);
    await gameDb.incrementTurnCount(gameId);
    return nextPlayer;
}
async function advancePhase(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    let nextPhase;
    switch (game.current_phase) {
        case constants_1.GAME_PHASES.MORNING:
            nextPhase = constants_1.GAME_PHASES.DAY;
            await gameDb.updateGamePhase(gameId, 'day');
            break;
        case constants_1.GAME_PHASES.DAY:
            nextPhase = constants_1.GAME_PHASES.NIGHT;
            await gameDb.updateGamePhase(gameId, 'night');
            break;
        case constants_1.GAME_PHASES.NIGHT:
            // After night, go to selling phase
            nextPhase = constants_1.GAME_PHASES.SELLING;
            await gameDb.updateGamePhase(gameId, 'selling');
            break;
        case constants_1.GAME_PHASES.SELLING:
            // After selling, start new day
            await gameDb.incrementDay(gameId);
            await decrementAllNutrition(gameId);
            nextPhase = constants_1.GAME_PHASES.MORNING;
            await gameDb.updateGamePhase(gameId, 'morning');
            // Reset to first player
            const players = await playerDb.getGamePlayers(gameId);
            if (players.length > 0) {
                await gameDb.updateCurrentPlayer(gameId, players[0].id);
            }
            break;
        default:
            nextPhase = constants_1.GAME_PHASES.MORNING;
    }
    // Reset action count for new phase
    await gameDb.resetActionCount(gameId);
    return nextPhase;
}
async function canPlayerAct(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    if (!game || game.status !== 'playing')
        return false;
    // Can only act during morning, day, or night phases
    if (game.current_phase === 'selling')
        return false;
    // Must be current player's turn
    return game.current_player_id === playerId;
}
async function decrementAllNutrition(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    for (const player of players) {
        const newNutrition = Math.max(0, player.nutrition - 1);
        await playerDb.updatePlayerNutrition(player.id, newNutrition);
    }
}
async function checkStarvation(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    return players.filter(p => p.nutrition < 1);
}
async function hasActionAvailable(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        return false;
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        return false;
    // Each phase allows 1 action per player
    // In a turn-based system, each player gets 1 action per phase
    // After action, turn advances to next player
    return true;
}
