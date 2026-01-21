"use strict";
// Day/Night Cycle Service
// Manages the progression of game phases and day transitions
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
exports.handleEndTurn = handleEndTurn;
exports.advancePhase = advancePhase;
exports.checkWinConditions = checkWinConditions;
exports.getPhaseDisplayInfo = getPhaseDisplayInfo;
const gameDb = __importStar(require("../../database/gameDb"));
const playerDb = __importStar(require("../../database/playerDb"));
const paintBag_1 = require("../paint/paintBag");
const sellingPhase_1 = require("./sellingPhase");
const constants_1 = require("../../utils/constants");
/**
 * End the current player's turn and potentially advance the phase
 */
async function handleEndTurn(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    const players = await playerDb.getGamePlayers(gameId);
    if (!game)
        throw new Error('Game not found');
    const currentPlayerIndex = players.findIndex(p => p.id === playerId);
    if (currentPlayerIndex === -1)
        throw new Error('Player not in game');
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];
    // Check if we've completed a round (all players have taken a turn)
    const isRoundComplete = nextPlayerIndex === 0;
    await gameDb.updateCurrentPlayer(gameId, nextPlayer.id);
    await gameDb.incrementTurnCount(gameId);
    if (isRoundComplete) {
        // Advance to next phase
        const phaseResult = await advancePhase(gameId);
        return {
            nextPlayerId: nextPlayer.id,
            phaseChanged: true,
            phaseResult,
        };
    }
    return {
        nextPlayerId: nextPlayer.id,
        phaseChanged: false,
    };
}
/**
 * Advance to the next game phase
 */
async function advancePhase(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    const currentPhase = game.current_phase;
    let result;
    switch (currentPhase) {
        case 'morning':
            // Morning -> Day
            await gameDb.updateGamePhase(gameId, 'day');
            result = { newPhase: 'day' };
            break;
        case 'day':
            // Day -> Night
            await gameDb.updateGamePhase(gameId, 'night');
            result = { newPhase: 'night' };
            break;
        case 'night':
            // Night -> Check for selling phase or new day
            result = await handleNightEnd(gameId);
            break;
        case 'selling':
            // Selling -> New day (Morning)
            result = await handleSellingEnd(gameId);
            break;
        default:
            await gameDb.updateGamePhase(gameId, 'morning');
            result = { newPhase: 'morning' };
    }
    // Reset action count for new phase
    await gameDb.resetActionCount(gameId);
    return result;
}
/**
 * Handle the end of night phase
 */
async function handleNightEnd(gameId) {
    // Check if any players completed paintings this day
    const sellingData = await (0, sellingPhase_1.initializeSellingPhase)(gameId);
    if (sellingData && sellingData.order.length > 0) {
        // Start selling phase
        await gameDb.updateGamePhase(gameId, 'selling');
        // Set current player to first in selling order
        const firstCollector = sellingData.order[0];
        await gameDb.updateCurrentPlayer(gameId, firstCollector.playerId);
        return {
            newPhase: 'selling',
            sellingPhaseStarted: true,
        };
    }
    // No completed paintings, go directly to new day
    return await startNewDay(gameId);
}
/**
 * Handle the end of selling phase
 */
async function handleSellingEnd(gameId) {
    const gameState = await gameDb.getGameState(gameId);
    // Clear selling phase data
    if (gameState) {
        await gameDb.updateGameState(gameId, {
            selling_phase_data: undefined,
        });
    }
    return await startNewDay(gameId);
}
/**
 * Start a new day - deduct nutrition, check eliminations, refill market
 */
async function startNewDay(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    const gameState = await gameDb.getGameState(gameId);
    // Deduct nutrition from all players
    const nutritionChanges = [];
    const eliminatedPlayers = [];
    for (const player of players) {
        const oldNutrition = player.nutrition;
        const newNutrition = Math.max(0, oldNutrition - 1);
        await playerDb.updatePlayerNutrition(player.id, newNutrition);
        nutritionChanges.push({
            playerId: player.id,
            oldNutrition,
            newNutrition,
        });
        if (newNutrition === 0) {
            eliminatedPlayers.push(player);
        }
    }
    // Check for winner if players are eliminated
    const alivePlayers = players.filter(p => !eliminatedPlayers.some(e => e.id === p.id));
    let winner;
    if (alivePlayers.length === 1) {
        // Last player standing wins
        winner = alivePlayers[0];
        await gameDb.setGameWinner(gameId, winner.id);
    }
    else if (alivePlayers.length === 0) {
        // All players eliminated - highest score wins
        const sortedByScore = [...players].sort((a, b) => b.score - a.score);
        winner = sortedByScore[0];
        await gameDb.setGameWinner(gameId, winner.id);
    }
    // Refill paint market
    let refillDetails;
    if (gameState && !winner) {
        const cubesNeeded = constants_1.PAINT_MARKET_REFILL_SIZE - gameState.paint_market.length;
        if (cubesNeeded > 0 && gameState.paint_bag.length > 0) {
            const { drawn, remaining } = (0, paintBag_1.drawPaintCubes)(gameState.paint_bag, cubesNeeded);
            await gameDb.updateGameState(gameId, {
                paint_market: [...gameState.paint_market, ...drawn],
                paint_bag: remaining,
            });
            refillDetails = { cubesAdded: drawn.length };
        }
    }
    // Increment day counter
    await gameDb.incrementDay(gameId);
    // Update to morning phase
    await gameDb.updateGamePhase(gameId, 'morning');
    // Reset to first player
    if (alivePlayers.length > 0) {
        const firstPlayer = alivePlayers.sort((a, b) => a.turn_order - b.turn_order)[0];
        await gameDb.updateCurrentPlayer(gameId, firstPlayer.id);
    }
    const game = await gameDb.getGame(gameId);
    return {
        newPhase: 'morning',
        newDay: game?.day_number,
        nutritionChanges,
        eliminatedPlayers: eliminatedPlayers.length > 0 ? eliminatedPlayers : undefined,
        refillDetails,
        winner,
    };
}
/**
 * Check if any player has met win conditions
 */
async function checkWinConditions(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    const playerCount = players.length;
    const winCondition = constants_1.WIN_CONDITIONS[playerCount] || constants_1.WIN_CONDITIONS[4];
    for (const player of players) {
        if (player.score >= winCondition.points || player.paintings_completed >= winCondition.paintings) {
            return player;
        }
    }
    return null;
}
/**
 * Get phase display info
 */
function getPhaseDisplayInfo(phase) {
    const phaseInfo = {
        morning: {
            icon: '☀️',
            label: 'Morning',
            description: 'Work, buy canvases, or paint',
        },
        day: {
            icon: '🌤️',
            label: 'Day',
            description: 'Continue your artistic journey',
        },
        night: {
            icon: '🌙',
            label: 'Night',
            description: 'Prepare for the end of day',
        },
        selling: {
            icon: '💰',
            label: 'Selling',
            description: 'Collect paint rewards for completed paintings',
        },
    };
    return phaseInfo[phase] || phaseInfo.morning;
}
