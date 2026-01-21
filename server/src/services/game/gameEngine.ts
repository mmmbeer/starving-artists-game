// Main game engine - game initialization and state management
import * as gameDb from '../database/gameDb';
import * as playerDb from '../database/playerDb';
import * as canvasDb from '../database/canvasDb';
import { createPaintBag, drawPaintCubes } from '../paint/paintBag';
import { createCanvasDeck, createInitialMarket } from '../canvas/canvasMarket';
import { initializeTurnOrder } from './turnManager';
import { FullGameState } from '../../models/types';
import { shuffleArray } from '../../utils/helpers';
import { INITIAL_PAINT_MARKET_SIZE } from '../../utils/constants';

export async function startGame(gameId: string): Promise<FullGameState> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  if (game.status !== 'lobby') {
    throw new Error('Game has already started');
  }
  
  const players = await playerDb.getGamePlayers(gameId);
  if (players.length < 2 || players.length > 4) {
    throw new Error('Game requires 2-4 players');
  }
  
  // Shuffle turn order
  const shuffledPlayers = shuffleArray([...players]);
  for (let i = 0; i < shuffledPlayers.length; i++) {
    const player = shuffledPlayers[i];
    // Update turn order in database
    await gameDb.execute(
      'UPDATE players SET turn_order = ? WHERE id = ?',
      [i, player.id]
    );
  }
  
  // Create paint bag
  const paintBag = createPaintBag();
  const shuffledBag = shuffleArray(paintBag);
  
  // Draw initial paint market
  const { drawn: initialMarket, remaining: bagAfterMarket } = drawPaintCubes(
    shuffledBag,
    INITIAL_PAINT_MARKET_SIZE
  );
  
  // Create canvas deck
  const canvasDeck = await createCanvasDeck();
  
  // Create initial canvas market
  const { market: canvasMarket, remaining: deckRemaining } = await createInitialMarket(
    canvasDeck
  );
  
  // Create game state
  await gameDb.createGameState(
    gameId,
    bagAfterMarket,
    initialMarket,
    canvasMarket,
    deckRemaining
  );
  
  // Update game status
  await gameDb.startGame(gameId);
  
  // Initialize turn order
  const updatedPlayers = await playerDb.getGamePlayers(gameId);
  await initializeTurnOrder(gameId, updatedPlayers);
  
  return getFullGameState(gameId);
}

export async function getFullGameState(gameId: string): Promise<FullGameState> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  const players = await playerDb.getGamePlayers(gameId);
  const gameState = await gameDb.getGameState(gameId);
  
  if (!gameState) {
    throw new Error('Game state not initialized');
  }
  
  // Get player canvases
  const playerCanvases: { [playerId: string]: any[] } = {};
  for (const player of players) {
    playerCanvases[player.id] = await canvasDb.getPlayerCanvases(player.id);
  }
  
  // Get player paint cubes
  const playerPaintCubes: { [playerId: string]: any[] } = {};
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

export async function isGameActive(gameId: string): Promise<boolean> {
  const game = await gameDb.getGame(gameId);
  return game?.status === 'playing';
}

export async function endGame(
  gameId: string,
  winnerId: string
): Promise<FullGameState> {
  await gameDb.setGameWinner(gameId, winnerId);
  return getFullGameState(gameId);
}
