"use strict";
// In-memory database adapter for development/testing
// This replaces MySQL calls with in-memory storage
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryDb = void 0;
const uuid_1 = require("uuid");
// In-memory stores
const games = new Map();
const players = new Map();
const gameStates = new Map();
const playerCanvases = new Map();
const playerPaintCubes = new Map();
const canvasDefinitions = [];
// Initialize some canvas definitions
function initCanvasDefinitions() {
    if (canvasDefinitions.length > 0)
        return;
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black'];
    const canvasTemplates = [
        { name: 'Sunset', star_value: 3, paint_value: 2, food_value: 1, squares: 4 },
        { name: 'Portrait', star_value: 4, paint_value: 3, food_value: 2, squares: 6 },
        { name: 'Landscape', star_value: 5, paint_value: 4, food_value: 3, squares: 8 },
        { name: 'Still Life', star_value: 3, paint_value: 2, food_value: 1, squares: 4 },
        { name: 'Abstract', star_value: 4, paint_value: 3, food_value: 2, squares: 5 },
        { name: 'Seascape', star_value: 5, paint_value: 4, food_value: 2, squares: 7 },
        { name: 'Cityscape', star_value: 6, paint_value: 5, food_value: 3, squares: 9 },
        { name: 'Wildlife', star_value: 4, paint_value: 3, food_value: 2, squares: 5 },
        { name: 'Flowers', star_value: 3, paint_value: 2, food_value: 1, squares: 4 },
        { name: 'Mountains', star_value: 5, paint_value: 4, food_value: 2, squares: 6 },
    ];
    canvasTemplates.forEach((template, index) => {
        const squares = [];
        const gridSize = Math.ceil(Math.sqrt(template.squares));
        for (let i = 0; i < template.squares; i++) {
            const x = i % gridSize;
            const y = Math.floor(i / gridSize);
            const allowedColors = [colors[Math.floor(Math.random() * colors.length)]];
            // Add a second allowed color for variety
            if (Math.random() > 0.5) {
                allowedColors.push(colors[Math.floor(Math.random() * colors.length)]);
            }
            squares.push({
                id: `sq-${index}-${i}`,
                x,
                y,
                allowedColors: [...new Set(allowedColors)], // Remove duplicates
            });
        }
        canvasDefinitions.push({
            id: index + 1,
            name: template.name,
            star_value: template.star_value,
            paint_value: template.paint_value,
            food_value: template.food_value,
            layout_json: { squares },
            image_filename: null,
        });
    });
}
// Initialize on module load
initCanvasDefinitions();
exports.memoryDb = {
    // Game operations
    createGame(hostPlayerId) {
        const gameId = (0, uuid_1.v4)();
        const game = {
            id: gameId,
            status: 'lobby',
            host_player_id: hostPlayerId,
            current_phase: 'morning',
            current_player_id: null,
            day_number: 1,
            turn_count: 0,
            created_at: new Date(),
            started_at: null,
            finished_at: null,
            winner_id: null,
        };
        games.set(gameId, game);
        return game;
    },
    getGame(gameId) {
        return games.get(gameId) || null;
    },
    updateGame(gameId, updates) {
        const game = games.get(gameId);
        if (game) {
            Object.assign(game, updates);
            games.set(gameId, game);
        }
        return game;
    },
    startGame(gameId) {
        return this.updateGame(gameId, {
            status: 'playing',
            started_at: new Date(),
        });
    },
    // Player operations
    createPlayer(gameId, name, isHost = false) {
        const playerId = (0, uuid_1.v4)();
        const gamePlayers = Array.from(players.values()).filter(p => p.game_id === gameId);
        const player = {
            id: playerId,
            game_id: gameId,
            name,
            nutrition: 5,
            score: 0,
            paintings_completed: 0,
            food_earned: 0,
            turn_order: gamePlayers.length,
            is_host: isHost,
            connected: true,
            last_seen: new Date(),
        };
        players.set(playerId, player);
        playerPaintCubes.set(playerId, []);
        playerCanvases.set(playerId, []);
        return player;
    },
    getPlayer(playerId) {
        return players.get(playerId) || null;
    },
    getGamePlayers(gameId) {
        return Array.from(players.values())
            .filter(p => p.game_id === gameId)
            .sort((a, b) => a.turn_order - b.turn_order);
    },
    updatePlayer(playerId, updates) {
        const player = players.get(playerId);
        if (player) {
            Object.assign(player, updates);
            players.set(playerId, player);
        }
        return player;
    },
    // Game state operations
    createGameState(gameId, paintBag, paintMarket, canvasMarket, canvasDeck) {
        const state = {
            game_id: gameId,
            paint_bag: paintBag,
            paint_market: paintMarket,
            canvas_market: canvasMarket,
            canvas_deck: canvasDeck,
            actions_taken: 0,
        };
        gameStates.set(gameId, state);
        return state;
    },
    getGameState(gameId) {
        return gameStates.get(gameId) || null;
    },
    updateGameState(gameId, updates) {
        const state = gameStates.get(gameId);
        if (state) {
            Object.assign(state, updates);
            gameStates.set(gameId, state);
        }
        return state;
    },
    incrementActionCount(gameId) {
        const state = gameStates.get(gameId);
        if (state) {
            state.actions_taken++;
            gameStates.set(gameId, state);
        }
    },
    // Paint cube operations
    getPlayerPaintCubes(playerId) {
        return playerPaintCubes.get(playerId) || [];
    },
    addPaintCubes(playerId, cubes) {
        const current = playerPaintCubes.get(playerId) || [];
        playerPaintCubes.set(playerId, [...current, ...cubes]);
    },
    removePaintCubes(playerId, cubeIds) {
        const current = playerPaintCubes.get(playerId) || [];
        const filtered = current.filter(c => !cubeIds.includes(c.id));
        playerPaintCubes.set(playerId, filtered);
    },
    // Canvas operations
    getCanvasDefinitions() {
        return canvasDefinitions;
    },
    getCanvasDefinition(id) {
        return canvasDefinitions.find(c => c.id === id) || null;
    },
    getPlayerCanvases(playerId) {
        const canvases = playerCanvases.get(playerId) || [];
        // Populate definitions
        return canvases.map(c => ({
            ...c,
            definition: this.getCanvasDefinition(c.canvas_definition_id),
        }));
    },
    addPlayerCanvas(playerId, gameId, definitionId) {
        const canvas = {
            id: (0, uuid_1.v4)(),
            player_id: playerId,
            game_id: gameId,
            canvas_definition_id: definitionId,
            painted_squares: [],
            completed: false,
            acquired_at: new Date(),
            completed_at: null,
        };
        const current = playerCanvases.get(playerId) || [];
        playerCanvases.set(playerId, [...current, canvas]);
        return canvas;
    },
    getPlayerCanvas(canvasId) {
        for (const [playerId, canvases] of playerCanvases) {
            const canvas = canvases.find(c => c.id === canvasId);
            if (canvas) {
                return {
                    ...canvas,
                    definition: this.getCanvasDefinition(canvas.canvas_definition_id),
                };
            }
        }
        return null;
    },
    updateCanvasPaintedSquares(canvasId, paintedSquares) {
        for (const [playerId, canvases] of playerCanvases) {
            const index = canvases.findIndex(c => c.id === canvasId);
            if (index >= 0) {
                canvases[index].painted_squares = paintedSquares;
                playerCanvases.set(playerId, canvases);
                return canvases[index];
            }
        }
        return null;
    },
    markCanvasCompleted(canvasId) {
        for (const [playerId, canvases] of playerCanvases) {
            const index = canvases.findIndex(c => c.id === canvasId);
            if (index >= 0) {
                canvases[index].completed = true;
                canvases[index].completed_at = new Date();
                playerCanvases.set(playerId, canvases);
                return canvases[index];
            }
        }
        return null;
    },
    // Utility
    clear() {
        games.clear();
        players.clear();
        gameStates.clear();
        playerCanvases.clear();
        playerPaintCubes.clear();
    },
};
exports.default = exports.memoryDb;
