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
// Game action handler - processes player actions
const gameDb = __importStar(require("../../database/gameDb"));
const playerDb = __importStar(require("../../database/playerDb"));
const canvasDb = __importStar(require("../../database/canvasDb"));
const paintBag_1 = require("../paint/paintBag");
const canvasMarket_1 = require("../canvas/canvasMarket");
const canvasManager_1 = require("../canvas/canvasManager");
const turnManager_1 = require("./turnManager");
const scoreTracker_1 = require("../score/scoreTracker");
const gameEngine_1 = require("./gameEngine");
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
    // Process each painting
    for (const { canvasId, squareId, cubeId } of paintings) {
        // Get canvas
        const canvas = await canvasDb.getPlayerCanvas(canvasId);
        if (!canvas)
            throw new Error('Canvas not found');
        if (canvas.player_id !== playerId) {
            throw new Error('Not your canvas');
        }
        // Get cube
        const cube = playerCubes.find(c => c.id === cubeId);
        if (!cube)
            throw new Error('Paint cube not found');
        if (cubesUsed.includes(cubeId)) {
            throw new Error('Cannot use same cube twice');
        }
        // Validate painting
        const validation = (0, canvasManager_1.canPaintSquare)(canvas, squareId, cube);
        if (!validation.valid) {
            throw new Error(validation.error || 'Cannot paint square');
        }
        // Paint the square
        const updatedCanvas = (0, canvasManager_1.paintSquare)(canvas, squareId, cube);
        // Update in database
        await canvasDb.updateCanvasPaintedSquares(canvasId, updatedCanvas.painted_squares);
        // Check if canvas is complete
        if ((0, canvasManager_1.isCanvasComplete)(updatedCanvas)) {
            await canvasDb.markCanvasCompleted(canvasId);
            await playerDb.incrementPaintingsCompleted(playerId);
        }
        cubesUsed.push(cubeId);
    }
    // Remove used cubes from player
    await playerDb.removePaintCubes(playerId, cubesUsed);
    // Increment action count
    await gameDb.incrementActionCount(gameId);
    // Advance to next player
    await (0, turnManager_1.advanceToNextPlayer)(gameId);
    // Check win condition
    const winCheck = await (0, scoreTracker_1.checkWinCondition)(gameId);
    if (winCheck.won && winCheck.winner) {
        await (0, scoreTracker_1.declareWinner)(gameId, winCheck.winner.id);
    }
    return (0, gameEngine_1.getFullGameState)(gameId);
}
async function performEndTurnAction(gameId, playerId) {
    // Verify player can act
    const canAct = await (0, turnManager_1.canPlayerAct)(gameId, playerId);
    if (!canAct)
        throw new Error('Not your turn');
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    const players = await playerDb.getGamePlayers(gameId);
    // Check if all players have acted in this phase
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState)
        throw new Error('Game state not found');
    // Advance to next player
    const nextPlayer = await (0, turnManager_1.advanceToNextPlayer)(gameId);
    // If we've cycled back to first player, advance phase
    if (nextPlayer.turn_order === 0) {
        await (0, turnManager_1.advancePhase)(gameId);
    }
    return (0, gameEngine_1.getFullGameState)(gameId);
}
