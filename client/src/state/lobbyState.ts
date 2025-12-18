import { useCallback, useEffect, useRef, useState } from 'react';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { GameState } from '../../../shared/types/game';
import type { PaintCube } from '../../../shared/types/paint';
import type { CanvasDefinition } from '../../../shared/types/canvas';
import type { GameActionIntent } from '../../../shared/types/gameActions';
import type {
  GameRealtimeServerMessage,
  GameRealtimeClientMessage,
  GameActionSummary
} from '../../../shared/types/realtime';

export type LobbyConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type CreateLobbyResponse = {
  lobby: LobbySnapshot;
};

type StartGameResponse = {
  gameState: GameState;
};

const samplePaintBag = (): PaintCube[] => [
  { id: 'bag-red', color: 'red' },
  { id: 'bag-blue', color: 'blue' },
  { id: 'bag-green', color: 'green' },
  { id: 'bag-black', color: 'black' }
];

const sampleCanvas = (): CanvasDefinition => ({
  id: 'canvas-sunrise',
  title: 'Sunrise Study',
  starValue: 1,
  paintValue: 1,
  foodValue: 1,
  squares: [
    { id: 'sunrise-1', position: { x: 0, y: 0 }, allowedColors: ['red'] },
    { id: 'sunrise-2', position: { x: 1, y: 0 }, allowedColors: ['orange', 'yellow'] }
  ]
});

const normalizeGameId = (value: string) => value.replace(/.*\/lobby\//, '').trim();

const createJsonRequest = async (url: string, init: RequestInit) => {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }
  return payload;
};

export const useLobbyState = () => {
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<LobbyConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('player-1');
  const [displayName, setDisplayName] = useState('Artist');

  const wsRef = useRef<WebSocket | null>(null);
  const gameSocketRef = useRef<WebSocket | null>(null);
  const [actionHistory, setActionHistory] = useState<GameActionSummary[]>([]);

  const updateLobby = useCallback((snapshot: LobbySnapshot) => {
    setLobby(snapshot);
    setGameId(snapshot.gameId);
    if (snapshot.phase === 'LOBBY') {
      setGameState(null);
    }
  }, []);

  const pushActionHistory = useCallback((entry: GameActionSummary) => {
    setActionHistory((previous) => [entry, ...previous].slice(0, 10));
  }, []);

  const connectRealtime = useCallback(() => {
    if (!gameId || !playerId) {
      setConnectionStatus('idle');
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/realtime/lobby?gameId=${encodeURIComponent(
      gameId
    )}&playerId=${encodeURIComponent(playerId)}`;

    wsRef.current?.close();
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;
    setConnectionStatus('connecting');

    socket.onopen = () => {
      setConnectionStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'LOBBY_STATE':
            updateLobby(data.payload);
            break;
          case 'GAME_STARTED':
            setGameState(data.payload);
            break;
          case 'ERROR':
            setError(data.payload.message);
            setConnectionStatus('error');
            break;
          default:
            break;
        }
      } catch (err) {
        setError('Failed to parse realtime message');
        setConnectionStatus('error');
      }
    };

    socket.onerror = () => {
      setConnectionStatus('error');
    };

    socket.onclose = () => {
      setConnectionStatus((previous) => (previous === 'error' ? previous : 'idle'));
    };
  }, [gameId, playerId, updateLobby]);

  const connectGameRealtime = useCallback(() => {
    if (!gameId || !playerId || !gameState) {
      gameSocketRef.current?.close();
      gameSocketRef.current = null;
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/realtime/game?gameId=${encodeURIComponent(
      gameId
    )}&playerId=${encodeURIComponent(playerId)}`;

    gameSocketRef.current?.close();
    const socket = new WebSocket(wsUrl);
    gameSocketRef.current = socket;

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GameRealtimeServerMessage;
        switch (data.type) {
          case 'GAME_STATE_UPDATED':
            setGameState(data.payload.state);
            if (data.payload.lastAction) {
              pushActionHistory(data.payload.lastAction);
            }
            break;
          case 'ERROR':
            setError(data.payload.message);
            break;
          default:
            break;
        }
      } catch {
        setError('Failed to parse realtime game message');
      }
    };

    socket.onerror = () => {
      setError('Realtime game connection failed');
    };

    socket.onclose = () => {
      if (gameSocketRef.current === socket) {
        gameSocketRef.current = null;
      }
    };
  }, [gameId, playerId, gameState, pushActionHistory]);

  const sendGameAction = useCallback((intent: GameActionIntent) => {
    const socket = gameSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('Game connection is not ready');
    }

    const message: GameRealtimeClientMessage = {
      type: 'GAME_ACTION',
      payload: intent
    };

    socket.send(JSON.stringify(message));
  }, []);

  const performWork = useCallback(() => {
    if (!playerId) {
      throw new Error('Player ID is required');
    }
    sendGameAction({ type: 'DRAW_PAINT_CUBES', payload: { playerId, count: 3 } });
  }, [playerId, sendGameAction]);

  const performEndTurn = useCallback(() => {
    if (!playerId) {
      throw new Error('Player ID is required');
    }
    sendGameAction({ type: 'END_TURN', payload: { playerId } });
  }, [playerId, sendGameAction]);

  const performBuyCanvas = useCallback(
    (slotIndex: number) => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }
      sendGameAction({ type: 'BUY_CANVAS', payload: { playerId, slotIndex } });
    },
    [playerId, sendGameAction]
  );

  const performPaint = useCallback(
    (canvasId: string, squareId: string, cubeId: string) => {
      if (!playerId) {
        throw new Error('Player ID is required');
      }
      sendGameAction({
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: { playerId, canvasId, squareId, cubeId }
      });
    },
    [playerId, sendGameAction]
  );

  useEffect(() => {
    connectRealtime();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connectRealtime]);

  useEffect(() => {
    if (!gameState) {
      gameSocketRef.current?.close();
      gameSocketRef.current = null;
      setActionHistory([]);
      return;
    }
    connectGameRealtime();
    return () => {
      gameSocketRef.current?.close();
      gameSocketRef.current = null;
    };
  }, [connectGameRealtime, gameState]);

  const createGame = useCallback(async (): Promise<LobbySnapshot> => {
    if (!playerId || !displayName) {
      throw new Error('Player ID and display name are required');
    }

    setError(null);
    try {
      const payload = await createJsonRequest('/lobby/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, displayName })
      });

      const snapshot = payload.lobby as LobbySnapshot;
      updateLobby(snapshot);
      return snapshot;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [playerId, displayName, updateLobby]);

  const joinGame = useCallback(async (): Promise<LobbySnapshot> => {
    if (!playerId || !displayName || !gameId) {
      throw new Error('Player ID, display name, and game ID are required');
    }

    setError(null);
    try {
      const payload = await createJsonRequest(`/lobby/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, displayName })
      });

      const snapshot = payload.lobby as LobbySnapshot;
      updateLobby(snapshot);
      return snapshot;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [playerId, displayName, gameId, updateLobby]);

  const leaveGame = useCallback(async (): Promise<LobbySnapshot | null> => {
    if (!playerId || !gameId) {
      return null;
    }

    setError(null);
    try {
      const payload = await createJsonRequest(`/lobby/${gameId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      const snapshot = payload.lobby as LobbySnapshot;
      updateLobby(snapshot);
      return snapshot;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [playerId, gameId, updateLobby]);

  const startGame = useCallback(async (): Promise<GameState> => {
    if (!lobby || !playerId) {
      throw new Error('Lobby must be joined before starting the game');
    }

    setError(null);
    try {
      const payload = await createJsonRequest(`/lobby/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          paintBag: samplePaintBag(),
          canvasDeck: [sampleCanvas()],
          initialPaintMarket: [],
          initialMarketSize: 2,
          turnOrder: lobby.players.map((player) => player.id),
          firstPlayerId: lobby.players[0]?.id,
          timestamp: new Date().toISOString()
        })
      });

      const result = payload.gameState as GameState;
      setGameState(result);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [gameId, lobby, playerId]);

  const resetGameState = useCallback(() => {
    gameSocketRef.current?.close();
    gameSocketRef.current = null;
    setActionHistory([]);
    setGameState(null);
  }, []);

  const updateGameId = useCallback((value: string) => {
    setGameId(normalizeGameId(value));
  }, []);

  return {
    lobby,
    gameState,
    connectionStatus,
    error,
    gameId,
    playerId,
    displayName,
    setPlayerId,
    setDisplayName,
    setGameId: updateGameId,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    resetGameState,
    actionHistory,
    onWork: performWork,
    onBuyCanvas: performBuyCanvas,
    onApplyPaint: performPaint,
    onEndTurn: performEndTurn
  };
};
