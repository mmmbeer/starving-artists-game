"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.getGame = getGame;
exports.updateGameStatus = updateGameStatus;
exports.updateGamePhase = updateGamePhase;
exports.updateCurrentPlayer = updateCurrentPlayer;
exports.incrementDay = incrementDay;
exports.incrementTurnCount = incrementTurnCount;
exports.setGameWinner = setGameWinner;
exports.startGame = startGame;
exports.deleteGame = deleteGame;
exports.createGameState = createGameState;
exports.getGameState = getGameState;
exports.updateGameState = updateGameState;
exports.resetActionCount = resetActionCount;
exports.incrementActionCount = incrementActionCount;
// Game database operations - using in-memory store
const memoryDb_1 = require("./memoryDb");
async function createGame(hostPlayerId) {
    return memoryDb_1.memoryDb.createGame(hostPlayerId);
}
async function getGame(gameId) {
    return memoryDb_1.memoryDb.getGame(gameId);
}
async function updateGameStatus(gameId, status) {
    memoryDb_1.memoryDb.updateGame(gameId, { status });
}
async function updateGamePhase(gameId, phase) {
    memoryDb_1.memoryDb.updateGame(gameId, { current_phase: phase });
}
async function updateCurrentPlayer(gameId, playerId) {
    memoryDb_1.memoryDb.updateGame(gameId, { current_player_id: playerId });
}
async function incrementDay(gameId) {
    const game = memoryDb_1.memoryDb.getGame(gameId);
    if (game) {
        memoryDb_1.memoryDb.updateGame(gameId, { day_number: game.day_number + 1 });
    }
}
async function incrementTurnCount(gameId) {
    const game = memoryDb_1.memoryDb.getGame(gameId);
    if (game) {
        memoryDb_1.memoryDb.updateGame(gameId, { turn_count: game.turn_count + 1 });
    }
}
async function setGameWinner(gameId, winnerId) {
    memoryDb_1.memoryDb.updateGame(gameId, {
        status: 'finished',
        winner_id: winnerId,
        finished_at: new Date(),
    });
}
async function startGame(gameId) {
    memoryDb_1.memoryDb.startGame(gameId);
}
async function deleteGame(gameId) {
    // In-memory: just remove from map
    const game = memoryDb_1.memoryDb.getGame(gameId);
    if (game) {
        // We'd need to add a delete method to memoryDb
        console.log('Delete game:', gameId);
    }
}
// Game state operations
async function createGameState(gameId, paintBag, paintMarket, canvasMarket, canvasDeck) {
    memoryDb_1.memoryDb.createGameState(gameId, paintBag, paintMarket, canvasMarket, canvasDeck);
}
async function getGameState(gameId) {
    return memoryDb_1.memoryDb.getGameState(gameId);
}
async function updateGameState(gameId, updates) {
    memoryDb_1.memoryDb.updateGameState(gameId, updates);
}
async function resetActionCount(gameId) {
    const state = memoryDb_1.memoryDb.getGameState(gameId);
    if (state) {
        memoryDb_1.memoryDb.updateGameState(gameId, { actions_taken: 0 });
    }
}
async function incrementActionCount(gameId) {
    memoryDb_1.memoryDb.incrementActionCount(gameId);
}
