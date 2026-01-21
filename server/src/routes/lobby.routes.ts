// Lobby routes
import { Router, Request, Response } from 'express';
import * as lobbyManager from '../services/lobby/lobbyManager';
import * as gameEngine from '../services/game/gameEngine';
import { isValidPlayerName, sanitizePlayerName } from '../utils/validation';

const router = Router();

// Create new game lobby
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { playerName } = req.body;
    
    if (!playerName || !isValidPlayerName(playerName)) {
      return res.status(400).json({
        error: 'Invalid player name. Must be 2-50 characters, alphanumeric.',
      });
    }
    
    const lobbyInfo = await lobbyManager.createLobby(playerName);
    
    // Store player ID in session
    req.session.playerId = lobbyInfo.players[0].id;
    req.session.gameId = lobbyInfo.game.id;
    
    res.json({
      success: true,
      gameId: lobbyInfo.game.id,
      playerId: lobbyInfo.players[0].id,
      redirectUrl: `/lobby/${lobbyInfo.game.id}`,
    });
  } catch (error) {
    console.error('Create lobby error:', error);
    res.status(500).json({ error: 'Failed to create lobby' });
  }
});

// Join existing game lobby
router.post('/join/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { playerName } = req.body;
    
    if (!playerName || !isValidPlayerName(playerName)) {
      return res.status(400).json({
        error: 'Invalid player name. Must be 2-50 characters, alphanumeric.',
      });
    }
    
    const lobbyInfo = await lobbyManager.joinLobby(gameId, playerName);
    const newPlayer = lobbyInfo.players.find(
      p => p.name === sanitizePlayerName(playerName)
    );
    
    if (!newPlayer) {
      return res.status(500).json({ error: 'Failed to join lobby' });
    }
    
    // Store player ID in session
    req.session.playerId = newPlayer.id;
    req.session.gameId = gameId;
    
    res.json({
      success: true,
      gameId,
      playerId: newPlayer.id,
      redirectUrl: `/lobby/${gameId}`,
    });
  } catch (error: any) {
    console.error('Join lobby error:', error);
    res.status(400).json({ error: error.message || 'Failed to join lobby' });
  }
});

// Get lobby page
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    const lobbyInfo = await lobbyManager.getLobbyInfo(gameId);
    const player = lobbyInfo.players.find(p => p.id === playerId);
    
    res.render('pages/lobby', {
      title: 'Game Lobby - Starving Artists',
      game: lobbyInfo.game,
      players: lobbyInfo.players,
      currentPlayer: player || null,
      canStart: lobbyInfo.canStart,
      isHost: player?.is_host || false,
    });
  } catch (error) {
    console.error('Get lobby error:', error);
    res.status(404).render('pages/error', {
      title: 'Error',
      message: 'Game not found',
    });
  }
});

// Start game
router.post('/:gameId/start', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const canStart = await lobbyManager.canStartGame(gameId, playerId);
    if (!canStart) {
      return res.status(403).json({ error: 'Cannot start game' });
    }
    
    await gameEngine.startGame(gameId);
    
    res.json({
      success: true,
      redirectUrl: `/game/${gameId}`,
    });
  } catch (error: any) {
    console.error('Start game error:', error);
    res.status(400).json({ error: error.message || 'Failed to start game' });
  }
});

// Leave lobby
router.post('/:gameId/leave', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await lobbyManager.leaveLobby(gameId, playerId);
    
    // Clear session
    req.session.playerId = undefined;
    req.session.gameId = undefined;
    
    res.json({ success: true, redirectUrl: '/' });
  } catch (error: any) {
    console.error('Leave lobby error:', error);
    res.status(400).json({ error: error.message || 'Failed to leave lobby' });
  }
});

export default router;
