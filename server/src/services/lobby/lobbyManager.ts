// Lobby management service
import * as gameDb from '../../database/gameDb';
import * as playerDb from '../../database/playerDb';
import { Game, Player } from '../../models/types';
import { sanitizePlayerName } from '../../utils/validation';

export interface LobbyInfo {
  game: Game;
  players: Player[];
  canStart: boolean;
}

export async function createLobby(playerName: string): Promise<LobbyInfo> {
  const sanitizedName = sanitizePlayerName(playerName);
  
  // Create player first to get ID for host
  const tempPlayerId = 'temp';
  const game = await gameDb.createGame(tempPlayerId);
  
  // Create host player
  const player = await playerDb.createPlayer(
    game.id,
    sanitizedName,
    0,
    true
  );
  
  // Update game with actual host player ID
  await gameDb.updateCurrentPlayer(game.id, player.id);
  
  const updatedGame = await gameDb.getGame(game.id);
  if (!updatedGame) throw new Error('Failed to create lobby');
  
  return {
    game: updatedGame,
    players: [player],
    canStart: false, // Need at least 2 players
  };
}

export async function joinLobby(
  gameId: string,
  playerName: string
): Promise<LobbyInfo> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  if (game.status !== 'lobby') {
    throw new Error('Game has already started');
  }
  
  const existingPlayers = await playerDb.getGamePlayers(gameId);
  if (existingPlayers.length >= 4) {
    throw new Error('Game is full (maximum 4 players)');
  }
  
  const sanitizedName = sanitizePlayerName(playerName);
  
  // Check for duplicate names
  const nameExists = existingPlayers.some(
    p => p.name.toLowerCase() === sanitizedName.toLowerCase()
  );
  if (nameExists) {
    throw new Error('Player name already taken');
  }
  
  // Create new player with next turn order
  const turnOrder = existingPlayers.length;
  const player = await playerDb.createPlayer(
    gameId,
    sanitizedName,
    turnOrder,
    false
  );
  
  const allPlayers = await playerDb.getGamePlayers(gameId);
  
  return {
    game,
    players: allPlayers,
    canStart: allPlayers.length >= 2,
  };
}

export async function leaveLobby(
  gameId: string,
  playerId: string
): Promise<LobbyInfo | null> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  const player = await playerDb.getPlayer(playerId);
  if (!player) throw new Error('Player not found');
  
  const players = await playerDb.getGamePlayers(gameId);
  
  // If player is host and game hasn't started, delete the game
  if (player.is_host && game.status === 'lobby') {
    await gameDb.deleteGame(gameId);
    return null;
  }
  
  // Remove player
  await playerDb.deletePlayer(playerId);
  
  const remainingPlayers = await playerDb.getGamePlayers(gameId);
  
  // If no players left, delete game
  if (remainingPlayers.length === 0) {
    await gameDb.deleteGame(gameId);
    return null;
  }
  
  return {
    game,
    players: remainingPlayers,
    canStart: remainingPlayers.length >= 2,
  };
}

export async function getLobbyInfo(gameId: string): Promise<LobbyInfo> {
  const game = await gameDb.getGame(gameId);
  if (!game) throw new Error('Game not found');
  
  const players = await playerDb.getGamePlayers(gameId);
  
  return {
    game,
    players,
    canStart: players.length >= 2 && game.status === 'lobby',
  };
}

export async function canStartGame(
  gameId: string,
  playerId: string
): Promise<boolean> {
  const game = await gameDb.getGame(gameId);
  if (!game || game.status !== 'lobby') return false;
  
  const player = await playerDb.getPlayer(playerId);
  if (!player || !player.is_host) return false;
  
  const players = await playerDb.getGamePlayers(gameId);
  return players.length >= 2 && players.length <= 4;
}
