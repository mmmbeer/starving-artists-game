// Game routes
import { Router, Request, Response } from 'express';
import * as gameEngine from '../services/game/gameEngine';
import * as actionHandler from '../services/game/actionHandler';
import * as sellingPhase from '../services/game/sellingPhase';
import { isValidUUID } from '../utils/validation';

const router = Router();

// Get game page
router.get('/:gameId', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.redirect('/');
    }
    
    const gameState = await gameEngine.getFullGameState(gameId);
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    
    if (!currentPlayer) {
      return res.status(403).render('pages/error', {
        title: 'Error',
        message: 'You are not part of this game',
      });
    }
    
    res.render('pages/game', {
      title: 'Game - Starving Artists',
      game: gameState.game,
      players: gameState.players,
      gameState: gameState.gameState,
      currentPlayer,
      playerCanvases: gameState.playerCanvases[playerId] || [],
      playerPaintCubes: gameState.playerPaintCubes[playerId] || [],
      allPlayerCanvases: gameState.playerCanvases,
      isCurrentTurn: gameState.game.current_player_id === playerId,
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(404).render('pages/error', {
      title: 'Error',
      message: 'Game not found',
    });
  }
});

// Perform work action
router.post('/:gameId/action/work', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const gameState = await actionHandler.performWorkAction(gameId, playerId);
    
    res.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Work action error:', error);
    res.status(400).json({ error: error.message || 'Failed to perform work action' });
  }
});

// Buy canvas action
router.post('/:gameId/action/buy-canvas', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const { slotIndex } = req.body;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (typeof slotIndex !== 'number' || slotIndex < 0 || slotIndex > 2) {
      return res.status(400).json({ error: 'Invalid slot index' });
    }
    
    const gameState = await actionHandler.performBuyCanvasAction(
      gameId,
      playerId,
      slotIndex
    );
    
    res.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Buy canvas error:', error);
    res.status(400).json({ error: error.message || 'Failed to buy canvas' });
  }
});

// Paint action
router.post('/:gameId/action/paint', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const { paintings } = req.body;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!Array.isArray(paintings) || paintings.length === 0) {
      return res.status(400).json({ error: 'Invalid paintings data' });
    }
    
    const gameState = await actionHandler.performPaintAction(
      gameId,
      playerId,
      paintings
    );
    
    res.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Paint action error:', error);
    res.status(400).json({ error: error.message || 'Failed to paint' });
  }
});

// End turn action
router.post('/:gameId/action/end-turn', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const gameState = await actionHandler.performEndTurnAction(gameId, playerId);
    
    res.json({ success: true, gameState });
  } catch (error: any) {
    console.error('End turn error:', error);
    res.status(400).json({ error: error.message || 'Failed to end turn' });
  }
});

// Submit selling intents
router.post('/:gameId/action/sell', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const { canvasIds } = req.body;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!Array.isArray(canvasIds)) {
      return res.status(400).json({ error: 'Invalid canvas IDs' });
    }
    
    // This endpoint just registers the intent
    // The actual selling happens when all players have submitted
    res.json({ success: true, message: 'Sell intent registered' });
  } catch (error: any) {
    console.error('Sell action error:', error);
    res.status(400).json({ error: error.message || 'Failed to register sell intent' });
  }
});

// Collect paint during selling phase
router.post('/:gameId/action/collect-paint', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const { cubeIds } = req.body;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!Array.isArray(cubeIds)) {
      return res.status(400).json({ error: 'Invalid cube IDs' });
    }
    
    const result = await actionHandler.performCollectPaintAction(gameId, playerId, cubeIds);
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${gameId}`).emit('game-state', result.gameState);
      io.to(`game:${gameId}`).emit('action-performed', {
        action: 'collect-paint',
        playerId,
        cubesCollected: result.cubesCollected.length,
      });
      
      if (result.sellingComplete) {
        io.to(`game:${gameId}`).emit('selling-complete', {
          gameId,
        });
      }
    }
    
    res.json({ 
      success: true, 
      gameState: result.gameState,
      cubesCollected: result.cubesCollected,
      sellingComplete: result.sellingComplete,
    });
  } catch (error: any) {
    console.error('Collect paint error:', error);
    res.status(400).json({ error: error.message || 'Failed to collect paint' });
  }
});

// Skip collection during selling phase
router.post('/:gameId/action/skip-collection', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const result = await actionHandler.performSkipCollectionAction(gameId, playerId);
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${gameId}`).emit('game-state', result.gameState);
      io.to(`game:${gameId}`).emit('action-performed', {
        action: 'skip-collection',
        playerId,
      });
      
      if (result.sellingComplete) {
        io.to(`game:${gameId}`).emit('selling-complete', {
          gameId,
        });
      }
    }
    
    res.json({ 
      success: true, 
      gameState: result.gameState,
      sellingComplete: result.sellingComplete,
    });
  } catch (error: any) {
    console.error('Skip collection error:', error);
    res.status(400).json({ error: error.message || 'Failed to skip collection' });
  }
});

// Get available actions for current player
router.get('/:gameId/available-actions', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const actions = await actionHandler.getAvailableActions(gameId, playerId);
    
    res.json({ success: true, ...actions });
  } catch (error: any) {
    console.error('Get available actions error:', error);
    res.status(400).json({ error: error.message || 'Failed to get available actions' });
  }
});

// Get current game state (API endpoint)
router.get('/:gameId/state', async (req: Request<{ gameId: string }>, res: Response) => {
  try {
    const { gameId } = req.params;
    const playerId = req.session.playerId;
    
    if (!playerId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const gameState = await gameEngine.getFullGameState(gameId);
    res.json({ success: true, gameState });
  } catch (error: any) {
    console.error('Get state error:', error);
    res.status(400).json({ error: error.message || 'Failed to get game state' });
  }
});

export default router;
