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
// Game database operations
const database_1 = require("../config/database");
const helpers_1 = require("../utils/helpers");
async function createGame(hostPlayerId) {
    const gameId = (0, helpers_1.generateId)();
    const sql = `
    INSERT INTO games (id, status, host_player_id, current_phase, day_number)
    VALUES (?, 'lobby', ?, 'morning', 1)
  `;
    await (0, database_1.execute)(sql, [gameId, hostPlayerId]);
    const game = await getGame(gameId);
    if (!game)
        throw new Error('Failed to create game');
    return game;
}
async function getGame(gameId) {
    const sql = 'SELECT * FROM games WHERE id = ?';
    return (0, database_1.queryOne)(sql, [gameId]);
}
async function updateGameStatus(gameId, status) {
    const sql = 'UPDATE games SET status = ? WHERE id = ?';
    await (0, database_1.execute)(sql, [status, gameId]);
}
async function updateGamePhase(gameId, phase) {
    const sql = 'UPDATE games SET current_phase = ? WHERE id = ?';
    await (0, database_1.execute)(sql, [phase, gameId]);
}
async function updateCurrentPlayer(gameId, playerId) {
    const sql = 'UPDATE games SET current_player_id = ? WHERE id = ?';
    await (0, database_1.execute)(sql, [playerId, gameId]);
}
async function incrementDay(gameId) {
    const sql = 'UPDATE games SET day_number = day_number + 1 WHERE id = ?';
    await (0, database_1.execute)(sql, [gameId]);
}
async function incrementTurnCount(gameId) {
    const sql = 'UPDATE games SET turn_count = turn_count + 1 WHERE id = ?';
    await (0, database_1.execute)(sql, [gameId]);
}
async function setGameWinner(gameId, winnerId) {
    const sql = `
    UPDATE games 
    SET status = 'finished', winner_id = ?, finished_at = NOW() 
    WHERE id = ?
  `;
    await (0, database_1.execute)(sql, [winnerId, gameId]);
}
async function startGame(gameId) {
    const sql = `
    UPDATE games 
    SET status = 'playing', started_at = NOW() 
    WHERE id = ?
  `;
    await (0, database_1.execute)(sql, [gameId]);
}
async function deleteGame(gameId) {
    const sql = 'DELETE FROM games WHERE id = ?';
    await (0, database_1.execute)(sql, [gameId]);
}
// Game state operations
async function createGameState(gameId, paintBag, paintMarket, canvasMarket, canvasDeck) {
    const sql = `
    INSERT INTO game_state (game_id, paint_bag, paint_market, canvas_market, canvas_deck, actions_taken)
    VALUES (?, ?, ?, ?, ?, 0)
  `;
    await (0, database_1.execute)(sql, [
        gameId,
        JSON.stringify(paintBag),
        JSON.stringify(paintMarket),
        JSON.stringify(canvasMarket),
        JSON.stringify(canvasDeck),
    ]);
}
async function getGameState(gameId) {
    const sql = 'SELECT * FROM game_state WHERE game_id = ?';
    const row = await (0, database_1.queryOne)(sql, [gameId]);
    if (!row)
        return null;
    return {
        game_id: row.game_id,
        paint_bag: JSON.parse(row.paint_bag),
        paint_market: JSON.parse(row.paint_market),
        canvas_market: JSON.parse(row.canvas_market),
        canvas_deck: JSON.parse(row.canvas_deck),
        actions_taken: row.actions_taken,
    };
}
async function updateGameState(gameId, updates) {
    const fields = [];
    const values = [];
    if (updates.paint_bag !== undefined) {
        fields.push('paint_bag = ?');
        values.push(JSON.stringify(updates.paint_bag));
    }
    if (updates.paint_market !== undefined) {
        fields.push('paint_market = ?');
        values.push(JSON.stringify(updates.paint_market));
    }
    if (updates.canvas_market !== undefined) {
        fields.push('canvas_market = ?');
        values.push(JSON.stringify(updates.canvas_market));
    }
    if (updates.canvas_deck !== undefined) {
        fields.push('canvas_deck = ?');
        values.push(JSON.stringify(updates.canvas_deck));
    }
    if (updates.actions_taken !== undefined) {
        fields.push('actions_taken = ?');
        values.push(updates.actions_taken);
    }
    if (fields.length === 0)
        return;
    values.push(gameId);
    const sql = `UPDATE game_state SET ${fields.join(', ')} WHERE game_id = ?`;
    await (0, database_1.execute)(sql, values);
}
async function resetActionCount(gameId) {
    const sql = 'UPDATE game_state SET actions_taken = 0 WHERE game_id = ?';
    await (0, database_1.execute)(sql, [gameId]);
}
async function incrementActionCount(gameId) {
    const sql = 'UPDATE game_state SET actions_taken = actions_taken + 1 WHERE game_id = ?';
    await (0, database_1.execute)(sql, [gameId]);
}
