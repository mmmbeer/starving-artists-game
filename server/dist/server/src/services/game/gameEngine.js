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
exports.startGame = startGame;
exports.getFullGameState = getFullGameState;
exports.isGameActive = isGameActive;
exports.endGame = endGame;
// Main game engine - game initialization and state management
const gameDb = __importStar(require("../database/gameDb"));
const playerDb = __importStar(require("../database/playerDb"));
const canvasDb = __importStar(require("../database/canvasDb"));
const paintBag_1 = require("../paint/paintBag");
const canvasMarket_1 = require("../canvas/canvasMarket");
const turnManager_1 = require("./turnManager");
const helpers_1 = require("../../utils/helpers");
const constants_1 = require("../../utils/constants");
async function startGame(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    if (game.status !== 'lobby') {
        throw new Error('Game has already started');
    }
    const players = await playerDb.getGamePlayers(gameId);
    if (players.length < 2 || players.length > 4) {
        throw new Error('Game requires 2-4 players');
    }
    // Shuffle turn order
    const shuffledPlayers = (0, helpers_1.shuffleArray)([...players]);
    for (let i = 0; i < shuffledPlayers.length; i++) {
        const player = shuffledPlayers[i];
        // Update turn order in database
        await gameDb.execute('UPDATE players SET turn_order = ? WHERE id = ?', [i, player.id]);
    }
    // Create paint bag
    const paintBag = (0, paintBag_1.createPaintBag)();
    const shuffledBag = (0, helpers_1.shuffleArray)(paintBag);
    // Draw initial paint market
    const { drawn: initialMarket, remaining: bagAfterMarket } = (0, paintBag_1.drawPaintCubes)(shuffledBag, constants_1.INITIAL_PAINT_MARKET_SIZE);
    // Create canvas deck
    const canvasDeck = await (0, canvasMarket_1.createCanvasDeck)();
    // Create initial canvas market
    const { market: canvasMarket, remaining: deckRemaining } = await (0, canvasMarket_1.createInitialMarket)(canvasDeck);
    // Create game state
    await gameDb.createGameState(gameId, bagAfterMarket, initialMarket, canvasMarket, deckRemaining);
    // Update game status
    await gameDb.startGame(gameId);
    // Initialize turn order
    const updatedPlayers = await playerDb.getGamePlayers(gameId);
    await (0, turnManager_1.initializeTurnOrder)(gameId, updatedPlayers);
    return getFullGameState(gameId);
}
async function getFullGameState(gameId) {
    const game = await gameDb.getGame(gameId);
    if (!game)
        throw new Error('Game not found');
    const players = await playerDb.getGamePlayers(gameId);
    const gameState = await gameDb.getGameState(gameId);
    if (!gameState) {
        throw new Error('Game state not initialized');
    }
    // Get player canvases
    const playerCanvases = {};
    for (const player of players) {
        playerCanvases[player.id] = await canvasDb.getPlayerCanvases(player.id);
    }
    // Get player paint cubes
    const playerPaintCubes = {};
    for (const player of players) {
        playerPaintCubes[player.id] = await playerDb.getPlayerPaintCubes(player.id);
    }
    return {
        game,
        players,
        gameState,
        playerCanvases,
        playerPaintCubes,
    };
}
async function isGameActive(gameId) {
    const game = await gameDb.getGame(gameId);
    return game?.status === 'playing';
}
async function endGame(gameId, winnerId) {
    await gameDb.setGameWinner(gameId, winnerId);
    return getFullGameState(gameId);
}
