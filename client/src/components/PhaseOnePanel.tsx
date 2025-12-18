import { useCallback, useMemo, useState } from 'react';
import type { GameState } from '../../../shared/types/game';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { PaintCube } from '../../../shared/types/paint';
import './PhaseOnePanel.css';

const sampleCanvasDeckFactory = (): CanvasDefinition[] => [
  {
    id: 'canvas-sunrise',
    title: 'Sunrise Study',
    starValue: 1,
    paintValue: 1,
    foodValue: 1,
    squares: [
      { id: 'sunrise-1', position: { x: 0, y: 0 }, allowedColors: ['red'] },
      { id: 'sunrise-2', position: { x: 1, y: 0 }, allowedColors: ['orange', 'yellow'] }
    ]
  },
  {
    id: 'canvas-emerald',
    title: 'Emerald Dream',
    starValue: 2,
    paintValue: 2,
    foodValue: 1,
    squares: [
      { id: 'emerald-1', position: { x: 0, y: 0 }, allowedColors: ['green'] },
      { id: 'emerald-2', position: { x: 1, y: 0 }, allowedColors: ['blue', 'green'] },
      { id: 'emerald-3', position: { x: 2, y: 0 }, allowedColors: ['wild'] }
    ]
  }
];

const samplePaintBagFactory = (): PaintCube[] => [
  { id: 'bag-red', color: 'red' },
  { id: 'bag-blue', color: 'blue' },
  { id: 'bag-green', color: 'green' },
  { id: 'bag-purple', color: 'purple' },
  { id: 'bag-wild', color: 'wild' }
];

const samplePaintMarketFactory = (): PaintCube[] => [
  { id: 'market-yellow', color: 'yellow' },
  { id: 'market-black', color: 'black' }
];

const createJsonRequest = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }
  return payload;
};

const PhaseOnePanel = () => {
  const [gameState, setGameState] = useState<GameState | undefined>();
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('player-1');
  const [displayName, setDisplayName] = useState('Alice');
  const [status, setStatus] = useState<string | null>(null);

  const effectiveGameId = useMemo(() => gameId || gameState?.id || '', [gameId, gameState]);

  const updateState = useCallback(
    (state: GameState) => {
      setGameState(state);
      setGameId(state.id);
      setStatus(`Phase ${state.phase} loaded (v${state.players.length} players)`);
    },
    [setGameState, setGameId, setStatus]
  );

  const handleCreateGame = async () => {
    try {
      const state = await createJsonRequest('/lobby/create', { method: 'POST' });
      updateState(state as GameState);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleJoinGame = async () => {
    if (!effectiveGameId) {
      setStatus('Enter or create a Game ID first');
      return;
    }
    try {
      const state = await createJsonRequest(`/lobby/${effectiveGameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, displayName })
      });
      updateState(state as GameState);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleStartGame = async () => {
    if (!effectiveGameId) {
      setStatus('Game ID required to start');
      return;
    }

    try {
      const payload = {
        paintBag: samplePaintBagFactory(),
        canvasDeck: sampleCanvasDeckFactory(),
        initialPaintMarket: samplePaintMarketFactory(),
        initialMarketSize: 2,
        turnOrder: gameState?.players.map((player) => player.id),
        firstPlayerId: gameState?.players[0]?.id ?? playerId
      };
      const state = await createJsonRequest(`/lobby/${effectiveGameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      updateState(state as GameState);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleAdvancePhase = async () => {
    if (!effectiveGameId) {
      setStatus('Game ID required to advance');
      return;
    }

    try {
      const state = await createJsonRequest(`/lobby/${effectiveGameId}/advance-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPhase: (gameState?.phase === 'LOBBY' ? 'MORNING' : undefined) as GameState['phase']
        })
      });
      updateState(state as GameState);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  const handleRefresh = async () => {
    if (!effectiveGameId) {
      setStatus('Game ID required to refresh');
      return;
    }
    try {
      const state = await createJsonRequest(`/lobby/${effectiveGameId}`, { method: 'GET' });
      updateState(state as GameState);
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section className="phase-one-panel">
      <header className="phase-one-panel__header">
        <h2>Phase 1 Rules Engine Sandbox</h2>
        <p>Interact with the server reducer through the lobby endpoints.</p>
      </header>
      <div className="phase-one-panel__controls">
        <div className="phase-one-panel__control">
          <label>
            Game ID
            <input
              type="text"
              value={effectiveGameId}
              placeholder="game-1"
              onChange={(event) => setGameId(event.target.value)}
            />
          </label>
          <div className="phase-one-panel__buttons">
            <button type="button" onClick={handleCreateGame}>
              Create Game
            </button>
            <button type="button" onClick={handleRefresh}>
              Refresh State
            </button>
          </div>
        </div>
        <div className="phase-one-panel__control">
          <label>
            Player ID
            <input type="text" value={playerId} onChange={(event) => setPlayerId(event.target.value)} />
          </label>
          <label>
            Display Name
            <input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <button type="button" onClick={handleJoinGame} disabled={!effectiveGameId}>
            Join Game
          </button>
        </div>
        <div className="phase-one-panel__control">
          <button type="button" onClick={handleStartGame} disabled={!effectiveGameId}>
            Start Game
          </button>
          <button type="button" onClick={handleAdvancePhase} disabled={!effectiveGameId}>
            Advance Phase
          </button>
        </div>
      </div>
      <div className="phase-one-panel__state">
        <strong>Latest state</strong>
        <pre>{gameState ? JSON.stringify(gameState, null, 2) : 'No state captured yet'}</pre>
      </div>
      <div className="phase-one-panel__status" role="status">
        {status}
      </div>
    </section>
  );
};

export default PhaseOnePanel;
