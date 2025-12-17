import { Router } from 'express';
import { joinGame, createGame, fetchLobby } from './lobbyService';

const router = Router();

router.post('/create', (_req, res) => {
  try {
    const newGame = createGame();
    return res.status(201).json(newGame);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/:gameId/join', (req, res) => {
  const { gameId } = req.params;
  const { playerId, displayName } = req.body;

  if (!playerId || !displayName) {
    return res.status(400).json({ error: 'playerId and displayName are required' });
  }

  try {
    const updatedLobby = joinGame(gameId, { id: playerId, displayName });
    return res.status(200).json(updatedLobby);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message });
  }
});

router.get('/:gameId', (req, res) => {
  const { gameId } = req.params;

  try {
    const lobby = fetchLobby(gameId);
    return res.status(200).json(lobby);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message });
  }
});

export default router;
