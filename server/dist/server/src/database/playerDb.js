"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayer = createPlayer;
exports.getPlayer = getPlayer;
exports.getGamePlayers = getGamePlayers;
exports.updatePlayerNutrition = updatePlayerNutrition;
exports.updatePlayerScore = updatePlayerScore;
exports.incrementPaintingsCompleted = incrementPaintingsCompleted;
exports.addFoodEarned = addFoodEarned;
exports.updatePlayerConnection = updatePlayerConnection;
exports.deletePlayer = deletePlayer;
exports.addPaintCube = addPaintCube;
exports.addPaintCubes = addPaintCubes;
exports.getPlayerPaintCubes = getPlayerPaintCubes;
exports.removePaintCube = removePaintCube;
exports.removePaintCubes = removePaintCubes;
exports.getPlayerPaintCubeCount = getPlayerPaintCubeCount;
// Player database operations
const database_1 = require("../config/database");
const helpers_1 = require("../utils/helpers");
async function createPlayer(gameId, name, turnOrder, isHost = false) {
    const playerId = (0, helpers_1.generateId)();
    const sql = `
    INSERT INTO players 
    (id, game_id, name, nutrition, score, paintings_completed, food_earned, turn_order, is_host, connected)
    VALUES (?, ?, ?, 5, 0, 0, 0, ?, ?, true)
  `;
    await (0, database_1.execute)(sql, [playerId, gameId, name, turnOrder, isHost]);
    const player = await getPlayer(playerId);
    if (!player)
        throw new Error('Failed to create player');
    return player;
}
async function getPlayer(playerId) {
    const sql = 'SELECT * FROM players WHERE id = ?';
    return (0, database_1.queryOne)(sql, [playerId]);
}
async function getGamePlayers(gameId) {
    const sql = 'SELECT * FROM players WHERE game_id = ? ORDER BY turn_order';
    return (0, database_1.query)(sql, [gameId]);
}
async function updatePlayerNutrition(playerId, nutrition) {
    const sql = 'UPDATE players SET nutrition = ? WHERE id = ?';
    await (0, database_1.execute)(sql, [nutrition, playerId]);
}
async function updatePlayerScore(playerId, score) {
    const sql = 'UPDATE players SET score = ? WHERE id = ?';
    await (0, database_1.execute)(sql, [score, playerId]);
}
async function incrementPaintingsCompleted(playerId) {
    const sql = `
    UPDATE players 
    SET paintings_completed = paintings_completed + 1 
    WHERE id = ?
  `;
    await (0, database_1.execute)(sql, [playerId]);
}
async function addFoodEarned(playerId, food) {
    const sql = 'UPDATE players SET food_earned = food_earned + ? WHERE id = ?';
    await (0, database_1.execute)(sql, [food, playerId]);
}
async function updatePlayerConnection(playerId, connected) {
    const sql = 'UPDATE players SET connected = ?, last_seen = NOW() WHERE id = ?';
    await (0, database_1.execute)(sql, [connected, playerId]);
}
async function deletePlayer(playerId) {
    const sql = 'DELETE FROM players WHERE id = ?';
    await (0, database_1.execute)(sql, [playerId]);
}
// Player paint cubes
async function addPaintCube(playerId, gameId, cube) {
    const sql = `
    INSERT INTO player_paint_cubes (id, player_id, game_id, color, is_wild)
    VALUES (?, ?, ?, ?, ?)
  `;
    await (0, database_1.execute)(sql, [cube.id, playerId, gameId, cube.color, cube.is_wild]);
}
async function addPaintCubes(playerId, gameId, cubes) {
    if (cubes.length === 0)
        return;
    const values = cubes.map(cube => [
        cube.id,
        playerId,
        gameId,
        cube.color,
        cube.is_wild,
    ]);
    const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const sql = `
    INSERT INTO player_paint_cubes (id, player_id, game_id, color, is_wild)
    VALUES ${placeholders}
  `;
    await (0, database_1.execute)(sql, values.flat());
}
async function getPlayerPaintCubes(playerId) {
    const sql = `
    SELECT id, color, is_wild 
    FROM player_paint_cubes 
    WHERE player_id = ?
    ORDER BY acquired_at
  `;
    return (0, database_1.query)(sql, [playerId]);
}
async function removePaintCube(playerId, cubeId) {
    const sql = 'DELETE FROM player_paint_cubes WHERE player_id = ? AND id = ?';
    await (0, database_1.execute)(sql, [playerId, cubeId]);
}
async function removePaintCubes(playerId, cubeIds) {
    if (cubeIds.length === 0)
        return;
    const placeholders = cubeIds.map(() => '?').join(', ');
    const sql = `
    DELETE FROM player_paint_cubes 
    WHERE player_id = ? AND id IN (${placeholders})
  `;
    await (0, database_1.execute)(sql, [playerId, ...cubeIds]);
}
async function getPlayerPaintCubeCount(playerId) {
    const sql = 'SELECT COUNT(*) as count FROM player_paint_cubes WHERE player_id = ?';
    const result = await (0, database_1.queryOne)(sql, [playerId]);
    return result?.count || 0;
}
