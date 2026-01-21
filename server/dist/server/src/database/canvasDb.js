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
// Canvas database operations
const database_1 = require("../config/database");
const helpers_1 = require("../utils/helpers");
async function getAllCanvasDefinitions() {
    const sql = 'SELECT * FROM canvas_definitions ORDER BY id';
    const rows = await (0, database_1.query)(sql);
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        layout_json: JSON.parse(row.layout_json),
        star_value: row.star_value,
        paint_value: row.paint_value,
        food_value: row.food_value,
        image_filename: row.image_filename,
    }));
}
async function getCanvasDefinition(canvasId) {
    const sql = 'SELECT * FROM canvas_definitions WHERE id = ?';
    const row = await (0, database_1.queryOne)(sql, [canvasId]);
    if (!row)
        return null;
    return {
        id: row.id,
        name: row.name,
        layout_json: JSON.parse(row.layout_json),
        star_value: row.star_value,
        paint_value: row.paint_value,
        food_value: row.food_value,
        image_filename: row.image_filename,
    };
}
async function getCanvasDefinitions(canvasIds) {
    if (canvasIds.length === 0)
        return [];
    const placeholders = canvasIds.map(() => '?').join(', ');
    const sql = `SELECT * FROM canvas_definitions WHERE id IN (${placeholders})`;
    const rows = await (0, database_1.query)(sql, canvasIds);
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        layout_json: JSON.parse(row.layout_json),
        star_value: row.star_value,
        paint_value: row.paint_value,
        food_value: row.food_value,
        image_filename: row.image_filename,
    }));
}
// Player canvas operations
async function addPlayerCanvas(playerId, gameId, canvasDefinitionId) {
    const canvasId = (0, helpers_1.generateId)();
    const sql = `
    INSERT INTO player_canvases 
    (id, player_id, game_id, canvas_definition_id, painted_squares, completed)
    VALUES (?, ?, ?, ?, '[]', false)
  `;
    await (0, database_1.execute)(sql, [canvasId, playerId, gameId, canvasDefinitionId]);
    const canvas = await getPlayerCanvas(canvasId);
    if (!canvas)
        throw new Error('Failed to create player canvas');
    return canvas;
}
async function getPlayerCanvas(canvasId) {
    const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.id = ?
  `;
    const row = await (0, database_1.queryOne)(sql, [canvasId]);
    if (!row)
        return null;
    return {
        id: row.id,
        player_id: row.player_id,
        game_id: row.game_id,
        canvas_definition_id: row.canvas_definition_id,
        painted_squares: JSON.parse(row.painted_squares),
        completed: row.completed,
        acquired_at: row.acquired_at,
        completed_at: row.completed_at,
        definition: {
            id: row.canvas_definition_id,
            name: row.def_name,
            layout_json: JSON.parse(row.layout_json),
            star_value: row.star_value,
            paint_value: row.paint_value,
            food_value: row.food_value,
            image_filename: row.image_filename,
        },
    };
}
async function getPlayerCanvases(playerId) {
    const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.player_id = ?
    ORDER BY pc.acquired_at
  `;
    const rows = await (0, database_1.query)(sql, [playerId]);
    return rows.map(row => ({
        id: row.id,
        player_id: row.player_id,
        game_id: row.game_id,
        canvas_definition_id: row.canvas_definition_id,
        painted_squares: JSON.parse(row.painted_squares),
        completed: row.completed,
        acquired_at: row.acquired_at,
        completed_at: row.completed_at,
        definition: {
            id: row.canvas_definition_id,
            name: row.def_name,
            layout_json: JSON.parse(row.layout_json),
            star_value: row.star_value,
            paint_value: row.paint_value,
            food_value: row.food_value,
            image_filename: row.image_filename,
        },
    }));
}
async function updateCanvasPaintedSquares(canvasId, paintedSquares) {
    const sql = `
    UPDATE player_canvases 
    SET painted_squares = ? 
    WHERE id = ?
  `;
    await (0, database_1.execute)(sql, [JSON.stringify(paintedSquares), canvasId]);
}
async function markCanvasCompleted(canvasId) {
    const sql = `
    UPDATE player_canvases 
    SET completed = true, completed_at = NOW() 
    WHERE id = ?
  `;
    await (0, database_1.execute)(sql, [canvasId]);
}
async function deletePlayerCanvas(canvasId) {
    const sql = 'DELETE FROM player_canvases WHERE id = ?';
    await (0, database_1.execute)(sql, [canvasId]);
}
async function getCompletedCanvases(playerId) {
    const sql = `
    SELECT 
      pc.*,
      cd.name as def_name,
      cd.layout_json,
      cd.star_value,
      cd.paint_value,
      cd.food_value,
      cd.image_filename
    FROM player_canvases pc
    LEFT JOIN canvas_definitions cd ON pc.canvas_definition_id = cd.id
    WHERE pc.player_id = ? AND pc.completed = true
    ORDER BY pc.completed_at
  `;
    const rows = await (0, database_1.query)(sql, [playerId]);
    return rows.map(row => ({
        id: row.id,
        player_id: row.player_id,
        game_id: row.game_id,
        canvas_definition_id: row.canvas_definition_id,
        painted_squares: JSON.parse(row.painted_squares),
        completed: row.completed,
        acquired_at: row.acquired_at,
        completed_at: row.completed_at,
        definition: {
            id: row.canvas_definition_id,
            name: row.def_name,
            layout_json: JSON.parse(row.layout_json),
            star_value: row.star_value,
            paint_value: row.paint_value,
            food_value: row.food_value,
            image_filename: row.image_filename,
        },
    }));
}
