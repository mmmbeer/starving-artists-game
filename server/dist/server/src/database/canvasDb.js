"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCanvasDefinitions = getAllCanvasDefinitions;
exports.getCanvasDefinition = getCanvasDefinition;
exports.getCanvasDefinitions = getCanvasDefinitions;
exports.addPlayerCanvas = addPlayerCanvas;
exports.getPlayerCanvas = getPlayerCanvas;
exports.getPlayerCanvases = getPlayerCanvases;
exports.updateCanvasPaintedSquares = updateCanvasPaintedSquares;
exports.markCanvasCompleted = markCanvasCompleted;
exports.deletePlayerCanvas = deletePlayerCanvas;
exports.getCompletedCanvases = getCompletedCanvases;
// Canvas database operations - using in-memory store
const memoryDb_1 = require("./memoryDb");
async function getAllCanvasDefinitions() {
    return memoryDb_1.memoryDb.getCanvasDefinitions();
}
async function getCanvasDefinition(canvasId) {
    return memoryDb_1.memoryDb.getCanvasDefinition(canvasId);
}
async function getCanvasDefinitions(canvasIds) {
    return canvasIds
        .map(id => memoryDb_1.memoryDb.getCanvasDefinition(id))
        .filter((c) => c !== null);
}
// Player canvas operations
async function addPlayerCanvas(playerId, gameId, canvasDefinitionId) {
    const canvas = memoryDb_1.memoryDb.addPlayerCanvas(playerId, gameId, canvasDefinitionId);
    return {
        ...canvas,
        definition: memoryDb_1.memoryDb.getCanvasDefinition(canvasDefinitionId) || undefined,
    };
}
async function getPlayerCanvas(canvasId) {
    return memoryDb_1.memoryDb.getPlayerCanvas(canvasId);
}
async function getPlayerCanvases(playerId) {
    return memoryDb_1.memoryDb.getPlayerCanvases(playerId);
}
async function updateCanvasPaintedSquares(canvasId, paintedSquares) {
    memoryDb_1.memoryDb.updateCanvasPaintedSquares(canvasId, paintedSquares);
}
async function markCanvasCompleted(canvasId) {
    memoryDb_1.memoryDb.markCanvasCompleted(canvasId);
}
async function deletePlayerCanvas(canvasId) {
    console.log('Delete player canvas:', canvasId);
}
async function getCompletedCanvases(playerId) {
    const canvases = memoryDb_1.memoryDb.getPlayerCanvases(playerId);
    return canvases.filter(c => c.completed);
}
