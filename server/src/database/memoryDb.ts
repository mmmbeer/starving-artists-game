// In-memory database adapter for development/testing
// This replaces MySQL calls with in-memory storage

import { v4 as uuidv4 } from 'uuid';

// In-memory stores
const games = new Map<string, any>();
const players = new Map<string, any>();
const gameStates = new Map<string, any>();
const playerCanvases = new Map<string, any[]>();
const playerPaintCubes = new Map<string, any[]>();
const canvasDefinitions: any[] = [];

// Initialize some canvas definitions
function initCanvasDefinitions() {
  if (canvasDefinitions.length > 0) return;
  
  const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black'];
  
  const canvasTemplates = [
    { name: 'Sunset', artist: 'Unknown', star_value: 3, paint_value: 2, food_value: 1, squares: 4, orientation: 'landscape' },
    { name: 'Portrait', artist: 'Unknown', star_value: 4, paint_value: 3, food_value: 2, squares: 6, orientation: 'portrait' },
    { name: 'Landscape', artist: 'Unknown', star_value: 5, paint_value: 4, food_value: 3, squares: 8, orientation: 'landscape' },
    { name: 'Still Life', artist: 'Unknown', star_value: 3, paint_value: 2, food_value: 1, squares: 4, orientation: 'landscape' },
    { name: 'Abstract', artist: 'Unknown', star_value: 4, paint_value: 3, food_value: 2, squares: 5, orientation: 'landscape' },
    { name: 'Seascape', artist: 'Unknown', star_value: 5, paint_value: 4, food_value: 2, squares: 7, orientation: 'landscape' },
    { name: 'Cityscape', artist: 'Unknown', star_value: 6, paint_value: 5, food_value: 3, squares: 9, orientation: 'landscape' },
    { name: 'Wildlife', artist: 'Unknown', star_value: 4, paint_value: 3, food_value: 2, squares: 5, orientation: 'landscape' },
    { name: 'Flowers', artist: 'Unknown', star_value: 3, paint_value: 2, food_value: 1, squares: 4, orientation: 'portrait' },
    { name: 'Mountains', artist: 'Unknown', star_value: 5, paint_value: 4, food_value: 2, squares: 6, orientation: 'landscape' },
  ];
  
  canvasTemplates.forEach((template, index) => {
    const squares = [];
    const gridSize = Math.ceil(Math.sqrt(template.squares));
    // Use pixel positions for proper rendering (each square ~40px)
    const squareSize = 40;
    const gap = 4;
    
    for (let i = 0; i < template.squares; i++) {
      const col = i % gridSize;
      const row = Math.floor(i / gridSize);
      const allowedColors = [colors[Math.floor(Math.random() * colors.length)]];
      // Add a second allowed color for variety
      if (Math.random() > 0.5) {
        allowedColors.push(colors[Math.floor(Math.random() * colors.length)]);
      }
      
      squares.push({
        id: `sq-${index}-${i}`,
        position: {
          x: col * (squareSize + gap),
          y: row * (squareSize + gap),
        },
        allowedColors: [...new Set(allowedColors)], // Remove duplicates
      });
    }
    
    canvasDefinitions.push({
      id: index + 1,
      name: template.name,
      artist: template.artist,
      star_value: template.star_value,
      paint_value: template.paint_value,
      food_value: template.food_value,
      layout_json: { 
        id: `canvas-${index + 1}`,
        orientation: template.orientation,
        squares,
      },
      filename: null,
    });
  });
}

// Initialize on module load
initCanvasDefinitions();

export const memoryDb = {
  // Game operations
  createGame(hostPlayerId: string) {
    const gameId = uuidv4();
    const game = {
      id: gameId,
      status: 'lobby' as const,
      host_player_id: hostPlayerId,
      current_phase: 'morning' as const,
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
  
  getGame(gameId: string) {
    return games.get(gameId) || null;
  },
  
  updateGame(gameId: string, updates: any) {
    const game = games.get(gameId);
    if (game) {
      Object.assign(game, updates);
      games.set(gameId, game);
    }
    return game;
  },
  
  startGame(gameId: string) {
    return this.updateGame(gameId, {
      status: 'playing',
      started_at: new Date(),
    });
  },
  
  // Player operations
  createPlayer(gameId: string, name: string, isHost: boolean = false) {
    const playerId = uuidv4();
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
  
  getPlayer(playerId: string) {
    return players.get(playerId) || null;
  },
  
  getGamePlayers(gameId: string) {
    return Array.from(players.values())
      .filter(p => p.game_id === gameId)
      .sort((a, b) => a.turn_order - b.turn_order);
  },
  
  updatePlayer(playerId: string, updates: any) {
    const player = players.get(playerId);
    if (player) {
      Object.assign(player, updates);
      players.set(playerId, player);
    }
    return player;
  },
  
  // Game state operations
  createGameState(gameId: string, paintBag: any[], paintMarket: any[], canvasMarket: any[], canvasDeck: number[]) {
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
  
  getGameState(gameId: string) {
    return gameStates.get(gameId) || null;
  },
  
  updateGameState(gameId: string, updates: any) {
    const state = gameStates.get(gameId);
    if (state) {
      Object.assign(state, updates);
      gameStates.set(gameId, state);
    }
    return state;
  },
  
  incrementActionCount(gameId: string) {
    const state = gameStates.get(gameId);
    if (state) {
      state.actions_taken++;
      gameStates.set(gameId, state);
    }
  },
  
  // Paint cube operations
  getPlayerPaintCubes(playerId: string) {
    return playerPaintCubes.get(playerId) || [];
  },
  
  addPaintCubes(playerId: string, cubes: any[]) {
    const current = playerPaintCubes.get(playerId) || [];
    playerPaintCubes.set(playerId, [...current, ...cubes]);
  },
  
  removePaintCubes(playerId: string, cubeIds: string[]) {
    const current = playerPaintCubes.get(playerId) || [];
    const filtered = current.filter(c => !cubeIds.includes(c.id));
    playerPaintCubes.set(playerId, filtered);
  },
  
  // Canvas operations
  getCanvasDefinitions() {
    return canvasDefinitions;
  },
  
  getCanvasDefinition(id: number) {
    return canvasDefinitions.find(c => c.id === id) || null;
  },
  
  getPlayerCanvases(playerId: string) {
    const canvases = playerCanvases.get(playerId) || [];
    // Populate definitions
    return canvases.map(c => ({
      ...c,
      definition: this.getCanvasDefinition(c.canvas_definition_id),
    }));
  },
  
  addPlayerCanvas(playerId: string, gameId: string, definitionId: number) {
    const canvas = {
      id: uuidv4(),
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
  
  getPlayerCanvas(canvasId: string) {
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
  
  updateCanvasPaintedSquares(canvasId: string, paintedSquares: any[]) {
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
  
  markCanvasCompleted(canvasId: string) {
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
  
  // Canvas definition management (admin)
  saveCanvasDefinition(id: number | null, data: any) {
    if (id) {
      // Update existing
      const index = canvasDefinitions.findIndex(c => c.id === id);
      if (index >= 0) {
        canvasDefinitions[index] = { ...canvasDefinitions[index], ...data, id };
        return canvasDefinitions[index];
      }
    }
    
    // Create new
    const newId = Math.max(...canvasDefinitions.map(c => c.id), 0) + 1;
    const newCanvas = { ...data, id: newId };
    canvasDefinitions.push(newCanvas);
    return newCanvas;
  },
  
  deleteCanvasDefinition(id: number) {
    const index = canvasDefinitions.findIndex(c => c.id === id);
    if (index >= 0) {
      canvasDefinitions.splice(index, 1);
      return true;
    }
    return false;
  },
  
  getCanvasDefinitionByFilename(filename: string) {
    return canvasDefinitions.find(c => c.filename === filename) || null;
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

export default memoryDb;
