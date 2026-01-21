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
exports.performWorkAction = performWorkAction;
exports.performBuyCanvasAction = performBuyCanvasAction;
exports.performPaintAction = performPaintAction;
exports.performEndTurnAction = performEndTurnAction;
exports.performCollectPaintAction = performCollectPaintAction;
exports.performSkipCollectionAction = performSkipCollectionAction;
exports.getAvailableActions = getAvailableActions;
// Game action handler - processes player actions
const gameDb = __importStar(require("../../database/gameDb"));
const playerDb = __importStar(require("../../database/playerDb"));
const canvasDb = __importStar(require("../../database/canvasDb"));
const paintBag_1 = require("../paint/paintBag");
const canvasMarket_1 = require("../canvas/canvasMarket");
const turnManager_1 = require("./turnManager");
const scoreTracker_1 = require("../score/scoreTracker");
const gameEngine_1 = require("./gameEngine");
const canvasCompletion_1 = require("./canvasCompletion");
const dayNightCycle_1 = require("./dayNightCycle");
const sellingPhase_1 = require("./sellingPhase");
const constants_1 = require("../../utils/constants");
async function performWorkAction(gameId, playerId) {
    // Verify player can act
    const canAct = await (0, turnManager_1.canPlayerAct)(gameId, playerId);
    if (!canAct)
        throw new Error('Not your turn');
    // Get game state
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        throw new Error('Game state not found');
    // Draw cubes from bag
    const { drawn, remaining } = (0, paintBag_1.drawPaintCubes)(gameState.paint_bag, constants_1.CUBES_PER_WORK_ACTION);
    if (drawn.length === 0) {
        throw new Error('Paint bag is empty');
    }
    // Add cubes to player's studio
    await playerDb.addPaintCubes(playerId, gameId, drawn);
    // Update game state
    await gameDb.updateGameState(gameId, {
        paint_bag: remaining,
    });
    // Increment action count
    await gameDb.incrementActionCount(gameId);
    // Advance to next player
    await (0, turnManager_1.advanceToNextPlayer)(gameId);
    return (0, gameEngine_1.getFullGameState)(gameId);
}
async function performBuyCanvasAction(gameId, playerId, slotIndex) {
    // Verify player can act
    const canAct = await (0, turnManager_1.canPlayerAct)(gameId, playerId);
    if (!canAct)
        throw new Error('Not your turn');
    if (slotIndex < 0 || slotIndex > 2) {
        throw new Error('Invalid canvas slot');
    }
    // Get game state
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        throw new Error('Game state not found');
    const canvas = gameState.canvas_market[slotIndex];
    if (!canvas)
        throw new Error('No canvas in that slot');
    // Check player has enough paint cubes
    const cost = (0, canvasMarket_1.getCanvasCost)(slotIndex);
    const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
    if (playerCubes.length < cost) {
        throw new Error(`Need ${cost} paint cubes to buy this canvas`);
    }
    // Remove paint cubes from player (any color)
    const cubesToRemove = playerCubes.slice(0, cost);
    await playerDb.removePaintCubes(playerId, cubesToRemove.map(c => c.id));
    // Add cubes to paint market
    const updatedMarket = [...gameState.paint_market, ...cubesToRemove];
    // Add canvas to player
    await canvasDb.addPlayerCanvas(playerId, gameId, canvas.id);
    // Remove canvas from market and shift remaining
    const newCanvasMarket = [...gameState.canvas_market];
    newCanvasMarket[slotIndex] = null;
    const shiftedMarket = (0, canvasMarket_1.shiftMarketLeft)(newCanvasMarket);
    // Refill from deck
    const { market: refilledMarket, remaining: deckRemaining } = await (0, canvasMarket_1.refillMarketSlot)(shiftedMarket, shiftedMarket.findIndex(c => c === null), gameState.canvas_deck);
    // Update game state
    await gameDb.updateGameState(gameId, {
        paint_market: updatedMarket,
        canvas_market: refilledMarket,
        canvas_deck: deckRemaining,
    });
    // Increment action count
    await gameDb.incrementActionCount(gameId);
    // Advance to next player
    await (0, turnManager_1.advanceToNextPlayer)(gameId);
    return (0, gameEngine_1.getFullGameState)(gameId);
}
async function performPaintAction(gameId, playerId, paintings) {
    // Verify player can act
    const canAct = await (0, turnManager_1.canPlayerAct)(gameId, playerId);
    if (!canAct)
        throw new Error('Not your turn');
    if (paintings.length === 0 || paintings.length > constants_1.MAX_PAINT_CUBES_PER_ACTION) {
        throw new Error(`Can paint 1-${constants_1.MAX_PAINT_CUBES_PER_ACTION} squares per action`);
    }
    // Get player's paint cubes
    const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
    const cubesUsed = [];
    const canvasUpdates = new Map();
    const completions = [];
    // Group paintings by canvas
    const paintingsByCanvas = new Map();
    for (const painting of paintings) {
        if (!paintingsByCanvas.has(painting.canvasId)) {
            paintingsByCanvas.set(painting.canvasId, []);
        }
        paintingsByCanvas.get(painting.canvasId).push({
            squareId: painting.squareId,
            cubeId: painting.cubeId,
        });
    }
    // Process each canvas
    for (const [canvasId, canvasPaintings] of paintingsByCanvas) {
        // Get canvas
        let canvas = canvasUpdates.get(canvasId) || await canvasDb.getPlayerCanvas(canvasId);
        if (!canvas)
            throw new Error('Canvas not found');
        if (canvas.player_id !== playerId) {
            throw new Error('Not your canvas');
        }
        // Process each painting on this canvas
        for (const { squareId, cubeId } of canvasPaintings) {
            // Get cube
            const cube = playerCubes.find(c => c.id === cubeId);
            if (!cube)
                throw new Error('Paint cube not found');
            if (cubesUsed.includes(cubeId)) {
                throw new Error('Cannot use same cube twice');
            }
            // Validate painting
            const validation = (0, canvasCompletion_1.validatePaintPlacement)(canvas, squareId, cube.color, cube.is_wild);
            if (!validation.valid) {
                throw new Error(validation.reason || 'Cannot paint square');
            }
            // Add to painted squares
            canvas = {
                ...canvas,
                painted_squares: [
                    ...canvas.painted_squares,
                    { squareId, cubeId, color: cube.color },
                ],
            };
            cubesUsed.push(cubeId);
        }
        // Update canvas in database
        await canvasDb.updateCanvasPaintedSquares(canvasId, canvas.painted_squares);
        canvasUpdates.set(canvasId, canvas);
        // Check completion
        const players = await playerDb.getGamePlayers(gameId);
        const completionResult = await (0, canvasCompletion_1.checkAndProcessCompletion)(playerId, canvasId, players.length);
        if (completionResult.isComplete && completionResult.rewardsAwarded) {
            completions.push({
                canvasId,
                rewards: completionResult.rewardsAwarded,
            });
            // Check if player won
            if (completionResult.isWinner) {
                await (0, scoreTracker_1.declareWinner)(gameId, playerId);
            }
        }
    }
    // Remove used cubes from player
    await playerDb.removePaintCubes(playerId, cubesUsed);
    // Increment action count
    await gameDb.incrementActionCount(gameId);
    // Advance to next player
    await (0, turnManager_1.advanceToNextPlayer)(gameId);
    return {
        gameState: await (0, gameEngine_1.getFullGameState)(gameId),
        completions,
    };
}
async function performEndTurnAction(gameId, playerId) {
    // Verify player can act
    const canAct = await (0, turnManager_1.canPlayerAct)(gameId, playerId);
    if (!canAct)
        throw new Error('Not your turn');
    const result = await (0, dayNightCycle_1.handleEndTurn)(gameId, playerId);
    return {
        gameState: await (0, gameEngine_1.getFullGameState)(gameId),
        phaseResult: result.phaseResult,
    };
}
/**
 * Collect paint cubes during selling phase
 */
async function performCollectPaintAction(gameId, playerId, selectedCubeIds) {
    const game = await gameDb.getGame(gameId);
    if (!game || game.current_phase !== 'selling') {
        throw new Error('Not in selling phase');
    }
    const result = await (0, sellingPhase_1.collectPaintCubes)(gameId, playerId, selectedCubeIds);
    // Check if selling phase is complete
    const sellingComplete = !result.sellingData.isActive;
    if (sellingComplete) {
        // Advance to next day
        const { handleEndTurn: advanceFromSelling } = await Promise.resolve().then(() => __importStar(require('./dayNightCycle')));
        // We need to trigger phase advancement
        const gameState = await gameDb.getGameState(gameId);
        if (gameState) {
            await gameDb.updateGameState(gameId, {
                selling_phase_data: undefined,
            });
        }
    }
    return {
        gameState: await (0, gameEngine_1.getFullGameState)(gameId),
        cubesCollected: result.cubesCollected,
        sellingComplete,
    };
}
/**
 * Skip collecting paint during selling phase
 */
async function performSkipCollectionAction(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    if (!game || game.current_phase !== 'selling') {
        throw new Error('Not in selling phase');
    }
    const sellingData = await (0, sellingPhase_1.skipCollection)(gameId, playerId);
    const sellingComplete = !sellingData.isActive;
    return {
        gameState: await (0, gameEngine_1.getFullGameState)(gameId),
        sellingComplete,
    };
}
/**
 * Get current action availability for a player
 */
async function getAvailableActions(gameId, playerId) {
    const game = await gameDb.getGame(gameId);
    if (!game) {
        return { canAct: false, availableActions: [], reason: 'Game not found' };
    }
    if (game.status !== 'playing') {
        return { canAct: false, availableActions: [], reason: 'Game not active' };
    }
    // During selling phase
    if (game.current_phase === 'selling') {
        const gameState = await gameDb.getGameState(gameId);
        if (gameState?.selling_phase_data) {
            const collector = (0, sellingPhase_1.getCurrentCollector)(gameState.selling_phase_data);
            if (collector && collector.playerId === playerId) {
                return {
                    canAct: true,
                    availableActions: ['collect_paint', 'skip_collection'],
                };
            }
        }
        return { canAct: false, availableActions: [], reason: 'Not your turn to collect' };
    }
    // Regular phases
    if (game.current_player_id !== playerId) {
        return { canAct: false, availableActions: [], reason: 'Not your turn' };
    }
    const gameState = await gameDb.getGameState(gameId);
    const playerCubes = await playerDb.getPlayerPaintCubes(playerId);
    const playerCanvases = await canvasDb.getPlayerCanvases(playerId);
    const actions = ['end_turn'];
    // Work: always available if bag not empty
    if (gameState && gameState.paint_bag.length > 0) {
        actions.push('work');
    }
    // Buy canvas: if player has enough cubes
    if (gameState && playerCubes.length >= 1) {
        actions.push('buy_canvas');
    }
    // Paint: if player has cubes and incomplete canvases
    if (playerCubes.length > 0 && playerCanvases.some(c => !c.completed)) {
        actions.push('paint');
    }
    return { canAct: true, availableActions: actions };
}
