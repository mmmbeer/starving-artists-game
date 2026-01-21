"use strict";
// Canvas Completion Service
// Handles detecting completed canvases and awarding rewards
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
exports.isCanvasComplete = isCanvasComplete;
exports.checkAndProcessCompletion = checkAndProcessCompletion;
exports.getCanvasProgress = getCanvasProgress;
exports.validatePaintPlacement = validatePaintPlacement;
exports.getCompletedCanvases = getCompletedCanvases;
exports.getCompletionSummary = getCompletionSummary;
const playerDb = __importStar(require("../../database/playerDb"));
const canvasDb = __importStar(require("../../database/canvasDb"));
const constants_1 = require("../../utils/constants");
/**
 * Check if a canvas is complete (all squares painted)
 */
function isCanvasComplete(canvas) {
    if (!canvas.definition || !canvas.definition.layout_json) {
        return false;
    }
    const totalSquares = canvas.definition.layout_json.squares.length;
    const paintedSquares = canvas.painted_squares.length;
    return paintedSquares >= totalSquares;
}
/**
 * Check if canvas is complete and process rewards if so
 */
async function checkAndProcessCompletion(playerId, canvasId, playerCount) {
    const canvas = await canvasDb.getPlayerCanvas(canvasId);
    if (!canvas || canvas.player_id !== playerId) {
        return { isComplete: false };
    }
    // Already completed
    if (canvas.completed) {
        return { isComplete: true };
    }
    // Check if all squares are painted
    if (!isCanvasComplete(canvas)) {
        return { isComplete: false };
    }
    // Mark canvas as completed
    await canvasDb.markCanvasCompleted(canvasId);
    // Get player to update stats
    const player = await playerDb.getPlayer(playerId);
    if (!player || !canvas.definition) {
        return { isComplete: true };
    }
    const rewards = {
        stars: canvas.definition.star_value,
        food: canvas.definition.food_value,
        paintValue: canvas.definition.paint_value,
    };
    // Award stars (points)
    const newScore = player.score + rewards.stars;
    await playerDb.updatePlayerScore(playerId, newScore);
    // Award food (nutrition)
    const newNutrition = player.nutrition + rewards.food;
    await playerDb.updatePlayerNutrition(playerId, newNutrition);
    await playerDb.addFoodEarned(playerId, rewards.food);
    // Increment paintings completed
    await playerDb.incrementPaintingsCompleted(playerId);
    // Check win condition
    const winCondition = constants_1.WIN_CONDITIONS[playerCount] || constants_1.WIN_CONDITIONS[4];
    const updatedPlayer = await playerDb.getPlayer(playerId);
    const isWinner = updatedPlayer && (updatedPlayer.score >= winCondition.points ||
        updatedPlayer.paintings_completed >= winCondition.paintings);
    return {
        isComplete: true,
        rewardsAwarded: rewards,
        isWinner: isWinner || false,
    };
}
/**
 * Get progress of a canvas
 */
function getCanvasProgress(canvas) {
    if (!canvas.definition || !canvas.definition.layout_json) {
        return { painted: 0, total: 0, percentage: 0 };
    }
    const total = canvas.definition.layout_json.squares.length;
    const painted = canvas.painted_squares.length;
    const percentage = total > 0 ? Math.round((painted / total) * 100) : 0;
    return { painted, total, percentage };
}
/**
 * Validate a paint placement
 */
function validatePaintPlacement(canvas, squareId, color, isWild) {
    if (!canvas.definition || !canvas.definition.layout_json) {
        return { valid: false, reason: 'Canvas definition not found' };
    }
    // Check if square exists
    const square = canvas.definition.layout_json.squares.find(s => s.id === squareId);
    if (!square) {
        return { valid: false, reason: 'Square not found on canvas' };
    }
    // Check if square is already painted
    const alreadyPainted = canvas.painted_squares.some(ps => ps.squareId === squareId);
    if (alreadyPainted) {
        return { valid: false, reason: 'Square is already painted' };
    }
    // Wild cubes can go anywhere, but only one per canvas
    if (isWild) {
        const hasWild = canvas.painted_squares.some(ps => ps.color === 'wild');
        if (hasWild) {
            return { valid: false, reason: 'Canvas already has a wild cube' };
        }
        return { valid: true };
    }
    // Check if color is allowed on this square
    const allowedColors = square.allowedColors || [];
    if (!allowedColors.includes(color)) {
        return { valid: false, reason: `Color ${color} not allowed on this square. Allowed: ${allowedColors.join(', ')}` };
    }
    return { valid: true };
}
/**
 * Get all completed canvases for a player
 */
async function getCompletedCanvases(playerId) {
    const canvases = await canvasDb.getPlayerCanvases(playerId);
    return canvases.filter(c => c.completed);
}
/**
 * Get canvas completion summary for all players
 */
async function getCompletionSummary(players) {
    const summary = [];
    for (const player of players) {
        const canvases = await canvasDb.getPlayerCanvases(player.id);
        const completed = canvases.filter(c => c.completed);
        // Find most recent completion
        let recentCompletion;
        if (completed.length > 0) {
            const recent = completed.sort((a, b) => (b.completed_at?.getTime() || 0) - (a.completed_at?.getTime() || 0))[0];
            if (recent.definition) {
                recentCompletion = {
                    canvasName: recent.definition.name,
                    stars: recent.definition.star_value,
                };
            }
        }
        summary.push({
            playerId: player.id,
            playerName: player.name,
            completedCount: completed.length,
            totalScore: player.score,
            recentCompletion,
        });
    }
    return summary;
}
