import { Router } from 'express';
import { createGame, fetchLobby, joinGame, leaveGame, startGame } from './lobbyService';

const router = Router();

const formatError = (error: unknown) => {
  const message = (error as Error).message ?? 'Unknown error';
  if (message.toLowerCase().includes('not found')) {
    return { status: 404, message };
  }
  if (message.toLowerCase().includes('host')) {
    return { status: 403, message };
  }
  return { status: 400, message };
};

router.post('/create', (req, res) => {
  const { playerId, displayName } = req.body;
  if (!playerId || !displayName) {
    return res.status(400).json({ error: 'playerId and displayName are required to create a game' });
  }

  try {
    const snapshot = createGame({ id: playerId, displayName });
    return res.status(201).json({ lobby: snapshot });
  } catch (error) {
    const { status, message } = formatError(error);
    return res.status(status).json({ error: message });
  }
});

router.post('/:gameId/join', (req, res) => {
  const { gameId } = req.params;
  const { playerId, displayName } = req.body;
  if (!playerId || !displayName) {
    return res.status(400).json({ error: 'playerId and displayName are required to join a game' });
  }

  try {
    const snapshot = joinGame(gameId, { id: playerId, displayName });
    return res.status(200).json({ lobby: snapshot });
  } catch (error) {
    const { status, message } = formatError(error);
    return res.status(status).json({ error: message });
  }
});

router.post('/:gameId/leave', (req, res) => {
  const { gameId } = req.params;
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required to leave a game' });
  }

  try {
    const snapshot = leaveGame(gameId, playerId);
    return res.status(200).json({ lobby: snapshot });
  } catch (error) {
    const { status, message } = formatError(error);
    return res.status(status).json({ error: message });
  }
});

router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;
  try {
    const snapshot = fetchLobby(gameId);
    return res.status(200).json({ lobby: snapshot });
  } catch (error) {
    const { status, message } = formatError(error);
    return res.status(status).json({ error: message });
  }
});

router.post('/:gameId/start', async (req, res) => {
  const { gameId } = req.params;
  const {
    playerId,
    paintBag,
    canvasDeck,
    canvasDeckOverride,
    initialPaintMarket,
    initialMarketSize,
    turnOrder,
    firstPlayerId,
    timestamp
  } = req.body;

  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required to start the game' });
  }
  if (!Array.isArray(paintBag) || paintBag.length === 0) {
    return res.status(400).json({ error: 'paintBag is required to start the game' });
  }

  try {
    const state = await startGame(gameId, playerId, {
      paintBag,
      canvasDeck,
      canvasDeckOverride,
      initialPaintMarket,
      initialMarketSize,
      turnOrder,
      firstPlayerId,
      timestamp
    });
    return res.status(200).json({ gameState: state });
  } catch (error) {
    const { status, message } = formatError(error);
    return res.status(status).json({ error: message });
  }
});

export default router;
