"use strict";
// Selling Phase Service
// Handles the paint collection phase after paintings are completed
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
exports.initializeSellingPhase = initializeSellingPhase;
exports.getCurrentCollector = getCurrentCollector;
exports.canCollectPaint = canCollectPaint;
exports.collectPaintCubes = collectPaintCubes;
exports.skipCollection = skipCollection;
exports.isSellingPhaseComplete = isSellingPhaseComplete;
exports.getSellingPhaseStatus = getSellingPhaseStatus;
const gameDb = __importStar(require("../../database/gameDb"));
const playerDb = __importStar(require("../../database/playerDb"));
const canvasDb = __importStar(require("../../database/canvasDb"));
const constants_1 = require("../../utils/constants");
/**
 * Initialize the selling phase based on completed paintings
 * Players are ordered by Paint Value of their completed paintings
 */
async function initializeSellingPhase(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        return null;
    // Gather all completed paintings from this round (not yet collected)
    const completedPaintings = [];
    for (const player of players) {
        const canvases = await canvasDb.getPlayerCanvases(player.id);
        // Find recently completed canvases (completed but not yet had selling phase)
        for (const canvas of canvases) {
            if (canvas.completed && canvas.definition) {
                completedPaintings.push({
                    playerId: player.id,
                    canvasId: canvas.id,
                    paintValue: canvas.definition.paint_value,
                    playerName: player.name,
                });
            }
        }
    }
    // If no completed paintings, skip selling phase
    if (completedPaintings.length === 0) {
        return null;
    }
    // Sort by paint value (highest first)
    completedPaintings.sort((a, b) => b.paintValue - a.paintValue);
    // Assign ranks and cubes per action
    const sellingOrder = completedPaintings.map((painting, index) => {
        let rank;
        let cubesPerAction;
        if (index === 0) {
            rank = 'first';
            cubesPerAction = constants_1.SELLING_PAINT_PAYOUT.FIRST; // 4 cubes
        }
        else if (index === 1) {
            rank = 'second';
            cubesPerAction = constants_1.SELLING_PAINT_PAYOUT.SECOND; // 2 cubes
        }
        else {
            rank = 'other';
            cubesPerAction = constants_1.SELLING_PAINT_PAYOUT.OTHER; // 1 cube
        }
        return {
            playerId: painting.playerId,
            paintValue: painting.paintValue,
            rank,
            cubesPerAction,
            remainingCubes: painting.paintValue, // Can collect up to paint value
            completedCanvasId: painting.canvasId,
        };
    });
    const sellingData = {
        order: sellingOrder,
        currentIndex: 0,
        paintMarketAtStart: [...gameState.paint_market],
        isActive: true,
    };
    // Store selling phase data in game state
    await gameDb.updateGameState(gameId, {
        selling_phase_data: sellingData,
    });
    return sellingData;
}
/**
 * Get the current player who should collect paint
 */
function getCurrentCollector(sellingData) {
    if (!sellingData.isActive || sellingData.currentIndex >= sellingData.order.length) {
        return null;
    }
    return sellingData.order[sellingData.currentIndex];
}
/**
 * Check if a player can collect paint cubes
 */
function canCollectPaint(sellingData, playerId, paintMarket) {
    if (!sellingData.isActive) {
        return { canCollect: false, maxCubes: 0, reason: 'Selling phase is not active' };
    }
    const currentCollector = getCurrentCollector(sellingData);
    if (!currentCollector) {
        return { canCollect: false, maxCubes: 0, reason: 'No current collector' };
    }
    if (currentCollector.playerId !== playerId) {
        return { canCollect: false, maxCubes: 0, reason: 'Not your turn to collect' };
    }
    if (paintMarket.length === 0) {
        return { canCollect: false, maxCubes: 0, reason: 'Paint market is empty' };
    }
    if (currentCollector.remainingCubes <= 0) {
        return { canCollect: false, maxCubes: 0, reason: 'No more cubes to collect' };
    }
    // Can collect up to cubesPerAction or remaining, whichever is smaller
    const maxCubes = Math.min(currentCollector.cubesPerAction, currentCollector.remainingCubes, paintMarket.length);
    return { canCollect: true, maxCubes };
}
/**
 * Player collects paint cubes from the market during selling phase
 */
async function collectPaintCubes(gameId, playerId, selectedCubeIds) {
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState || !gameState.selling_phase_data) {
        throw new Error('Selling phase not active');
    }
    const sellingData = gameState.selling_phase_data;
    const canCollect = canCollectPaint(sellingData, playerId, gameState.paint_market);
    if (!canCollect.canCollect) {
        throw new Error(canCollect.reason || 'Cannot collect paint');
    }
    // Validate selected cubes exist in market
    const selectedCubes = [];
    for (const cubeId of selectedCubeIds) {
        const cube = gameState.paint_market.find(c => c.id === cubeId);
        if (!cube) {
            throw new Error(`Cube ${cubeId} not found in paint market`);
        }
        selectedCubes.push(cube);
    }
    // Validate not taking more than allowed
    if (selectedCubes.length > canCollect.maxCubes) {
        throw new Error(`Can only collect ${canCollect.maxCubes} cubes`);
    }
    // Add cubes to player's inventory
    await playerDb.addPaintCubes(playerId, gameId, selectedCubes);
    // Remove cubes from market
    const newPaintMarket = gameState.paint_market.filter(c => !selectedCubeIds.includes(c.id));
    // Update selling data
    const currentIndex = sellingData.currentIndex;
    sellingData.order[currentIndex].remainingCubes -= selectedCubes.length;
    // Check if current player is done collecting or market empty
    const shouldAdvance = sellingData.order[currentIndex].remainingCubes <= 0 ||
        newPaintMarket.length === 0;
    if (shouldAdvance) {
        sellingData.currentIndex++;
        // Skip players who can't collect anymore
        while (sellingData.currentIndex < sellingData.order.length &&
            (sellingData.order[sellingData.currentIndex].remainingCubes <= 0 || newPaintMarket.length === 0)) {
            sellingData.currentIndex++;
        }
    }
    // Check if selling phase is complete
    sellingData.isActive = sellingData.currentIndex < sellingData.order.length && newPaintMarket.length > 0;
    // Update game state
    await gameDb.updateGameState(gameId, {
        paint_market: newPaintMarket,
        selling_phase_data: sellingData,
    });
    return {
        success: true,
        sellingData,
        cubesCollected: selectedCubes,
    };
}
/**
 * Skip collecting (pass turn)
 */
async function skipCollection(gameId, playerId) {
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState || !gameState.selling_phase_data) {
        throw new Error('Selling phase not active');
    }
    const sellingData = gameState.selling_phase_data;
    const currentCollector = getCurrentCollector(sellingData);
    if (!currentCollector || currentCollector.playerId !== playerId) {
        throw new Error('Not your turn to collect');
    }
    // Mark current player as done (set remaining to 0)
    sellingData.order[sellingData.currentIndex].remainingCubes = 0;
    sellingData.currentIndex++;
    // Check if selling phase is complete
    sellingData.isActive = sellingData.currentIndex < sellingData.order.length;
    await gameDb.updateGameState(gameId, {
        selling_phase_data: sellingData,
    });
    return sellingData;
}
/**
 * Check if selling phase is complete
 */
function isSellingPhaseComplete(sellingData) {
    if (!sellingData)
        return true;
    return !sellingData.isActive;
}
/**
 * Get selling phase status for UI
 */
function getSellingPhaseStatus(sellingData, players) {
    if (!sellingData || !sellingData.isActive) {
        return { isActive: false, currentCollector: null, order: [] };
    }
    const currentEntry = getCurrentCollector(sellingData);
    let currentCollector = null;
    if (currentEntry) {
        const player = players.find(p => p.id === currentEntry.playerId);
        currentCollector = {
            playerId: currentEntry.playerId,
            playerName: player?.name || 'Unknown',
            cubesPerAction: currentEntry.cubesPerAction,
            remainingCubes: currentEntry.remainingCubes,
        };
    }
    const order = sellingData.order.map((entry, index) => {
        const player = players.find(p => p.id === entry.playerId);
        return {
            playerId: entry.playerId,
            playerName: player?.name || 'Unknown',
            rank: entry.rank,
            done: index < sellingData.currentIndex || entry.remainingCubes <= 0,
        };
    });
    return { isActive: true, currentCollector, order };
}
