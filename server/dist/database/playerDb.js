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
// Player database operations - using in-memory store
const memoryDb_1 = require("./memoryDb");
async function createPlayer(gameId, name, turnOrder, isHost = false) {
    const player = memoryDb_1.memoryDb.createPlayer(gameId, name, isHost);
    memoryDb_1.memoryDb.updatePlayer(player.id, { turn_order: turnOrder });
    return player;
}
async function getPlayer(playerId) {
    return memoryDb_1.memoryDb.getPlayer(playerId);
}
async function getGamePlayers(gameId) {
    return memoryDb_1.memoryDb.getGamePlayers(gameId);
}
async function updatePlayerNutrition(playerId, nutrition) {
    memoryDb_1.memoryDb.updatePlayer(playerId, { nutrition });
}
async function updatePlayerScore(playerId, score) {
    memoryDb_1.memoryDb.updatePlayer(playerId, { score });
}
async function incrementPaintingsCompleted(playerId) {
    const player = memoryDb_1.memoryDb.getPlayer(playerId);
    if (player) {
        memoryDb_1.memoryDb.updatePlayer(playerId, {
            paintings_completed: player.paintings_completed + 1,
        });
    }
}
async function addFoodEarned(playerId, food) {
    const player = memoryDb_1.memoryDb.getPlayer(playerId);
    if (player) {
        memoryDb_1.memoryDb.updatePlayer(playerId, {
            food_earned: player.food_earned + food,
        });
    }
}
async function updatePlayerConnection(playerId, connected) {
    memoryDb_1.memoryDb.updatePlayer(playerId, {
        connected,
        last_seen: new Date(),
    });
}
async function deletePlayer(playerId) {
    // In-memory: would need delete method
    console.log('Delete player:', playerId);
}
// Player paint cubes
async function addPaintCube(playerId, gameId, cube) {
    memoryDb_1.memoryDb.addPaintCubes(playerId, [cube]);
}
async function addPaintCubes(playerId, gameId, cubes) {
    memoryDb_1.memoryDb.addPaintCubes(playerId, cubes);
}
async function getPlayerPaintCubes(playerId) {
    return memoryDb_1.memoryDb.getPlayerPaintCubes(playerId);
}
async function removePaintCube(playerId, cubeId) {
    memoryDb_1.memoryDb.removePaintCubes(playerId, [cubeId]);
}
async function removePaintCubes(playerId, cubeIds) {
    memoryDb_1.memoryDb.removePaintCubes(playerId, cubeIds);
}
async function getPlayerPaintCubeCount(playerId) {
    const cubes = memoryDb_1.memoryDb.getPlayerPaintCubes(playerId);
    return cubes.length;
}
