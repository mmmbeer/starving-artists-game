"use strict";
// Validation utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUUID = isValidUUID;
exports.isValidPlayerName = isValidPlayerName;
exports.sanitizePlayerName = sanitizePlayerName;
exports.validateGameAction = validateGameAction;
exports.isValidCanvasSlot = isValidCanvasSlot;
exports.isValidColor = isValidColor;
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
function isValidPlayerName(name) {
    return name.length >= 2 && name.length <= 50 && /^[a-zA-Z0-9\s-_]+$/.test(name);
}
function sanitizePlayerName(name) {
    return name.trim().replace(/\s+/g, ' ');
}
function validateGameAction(action) {
    if (!action || typeof action !== 'object') {
        return { valid: false, error: 'Invalid action format' };
    }
    if (!['work', 'buy_canvas', 'paint', 'end_turn', 'sell'].includes(action.type)) {
        return { valid: false, error: 'Invalid action type' };
    }
    if (!action.playerId || !isValidUUID(action.playerId)) {
        return { valid: false, error: 'Invalid player ID' };
    }
    return { valid: true };
}
function isValidCanvasSlot(slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < 3;
}
function isValidColor(color) {
    return ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'wild'].includes(color);
}
