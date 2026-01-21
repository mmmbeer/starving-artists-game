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
exports.collectSellIntents = collectSellIntents;
exports.sellCanvas = sellCanvas;
exports.completeSelling = completeSelling;
// Selling phase - round robin canvas selling
const gameDb = __importStar(require("../../database/gameDb"));
const playerDb = __importStar(require("../../database/playerDb"));
const canvasDb = __importStar(require("../../database/canvasDb"));
const scoreTracker_1 = require("../score/scoreTracker");
const gameEngine_1 = require("./gameEngine");
const constants_1 = require("../../utils/constants");
async function collectSellIntents(gameId, intents) {
    const players = await playerDb.getGamePlayers(gameId);
    const results = [];
    // Process in turn order
    const sortedPlayers = [...players].sort((a, b) => a.turn_order - b.turn_order);
    for (const player of sortedPlayers) {
        const intent = intents.find(i => i.playerId === player.id);
        if (!intent || intent.canvasIds.length === 0)
            continue;
        // Process each canvas the player wants to sell
        for (const canvasId of intent.canvasIds) {
            const result = await sellCanvas(gameId, player.id, canvasId);
            if (result) {
                results.push(result);
            }
        }
    }
    return results;
}
async function sellCanvas(gameId, playerId, canvasId) {
    const canvas = await canvasDb.getPlayerCanvas(canvasId);
    if (!canvas || !canvas.completed || canvas.player_id !== playerId) {
        return null;
    }
    if (!canvas.definition) {
        return null;
    }
    const { star_value, food_value, paint_value } = canvas.definition;
    // Add nutrition
    const player = await playerDb.getPlayer(playerId);
    if (!player)
        return null;
    let newNutrition = player.nutrition + food_value;
    let excessFood = 0;
    // If nutrition exceeds 5, gain 4 paint cubes per excess food
    if (newNutrition > 5) {
        excessFood = newNutrition - 5;
        newNutrition = 5;
    }
    await playerDb.updatePlayerNutrition(playerId, newNutrition);
    await playerDb.addFoodEarned(playerId, food_value);
    // Award paint cubes from market based on paint value
    const paintReceived = await awardPaintCubes(gameId, playerId, paint_value);
    // Add extra cubes for excess food
    if (excessFood > 0) {
        const bonusCubes = excessFood * 4;
        await awardPaintCubes(gameId, playerId, bonusCubes);
    }
    // Award star points
    await (0, scoreTracker_1.updatePlayerScore)(playerId, star_value);
    // Return painted cubes to bag
    const gameState = await gameDb.getGameState(gameId);
    if (gameState) {
        // Get the cubes that were used on this canvas
        const cubeIds = canvas.painted_squares.map(ps => ps.cubeId);
        // We need to recreate the cubes (they're not stored anymore)
        // In a real implementation, we'd track these properly
        // For now, just delete the canvas
    }
    // Delete the canvas
    await canvasDb.deletePlayerCanvas(canvasId);
    return {
        playerId,
        canvasId,
        starValue: star_value,
        foodValue: food_value,
        paintValue: paint_value,
        paintReceived,
    };
}
async function awardPaintCubes(gameId, playerId, paintValue) {
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        return 0;
    // Determine how many cubes to award based on paint value rank
    // This is simplified - real game has complex payout rules
    let cubesToAward = 0;
    if (paintValue >= 4) {
        cubesToAward = constants_1.SELLING_PAINT_PAYOUT.FIRST; // 4 cubes
    }
    else if (paintValue >= 2) {
        cubesToAward = constants_1.SELLING_PAINT_PAYOUT.SECOND; // 2 cubes
    }
    else {
        cubesToAward = constants_1.SELLING_PAINT_PAYOUT.OTHER; // 1 cube
    }
    // Take cubes from paint market
    const availableCubes = gameState.paint_market.slice(0, cubesToAward);
    const remainingMarket = gameState.paint_market.slice(cubesToAward);
    if (availableCubes.length > 0) {
        await playerDb.addPaintCubes(playerId, gameId, availableCubes);
        await gameDb.updateGameState(gameId, {
            paint_market: remainingMarket,
        });
    }
    return availableCubes.length;
}
async function completeSelling(gameId, intents) {
    // Collect and process all sell intents
    await collectSellIntents(gameId, intents);
    // After selling, check for starvation
    const players = await playerDb.getGamePlayers(gameId);
    const starvedPlayers = players.filter(p => p.nutrition < 1);
    if (starvedPlayers.length > 0) {
        // Game ends due to starvation
        // Winner is player with highest score
        const sortedPlayers = [...players].sort((a, b) => {
            if (a.score !== b.score)
                return b.score - a.score;
            if (a.paintings_completed !== b.paintings_completed) {
                return b.paintings_completed - a.paintings_completed;
            }
            return b.food_earned - a.food_earned;
        });
        const winner = sortedPlayers[0];
        await gameDb.setGameWinner(gameId, winner.id);
    }
    return (0, gameEngine_1.getFullGameState)(gameId);
}
