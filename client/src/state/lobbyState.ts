import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LobbySnapshot } from '@shared/types/lobby';
import type { GameState } from '@shared/types/game';
import type { PaintCube } from '@shared/types/paint';
import type { GameActionIntent } from '@shared/types/gameActions';
import type {
  GameRealtimeServerMessage,
  GameRealtimeClientMessage,
  GameActionSummary
} from '@shared/types/realtime';
import { io, type Socket } from 'socket.io-client';

export type LobbyConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type CreateLobbyResponse = {
  lobby: LobbySnapshot;
};

type StartGameResponse = {
  gameState: GameState;
};

type LobbyTransport =
  | { type: 'websocket'; socket: WebSocket }
  | { type: 'socketio'; socket: Socket };

type GameTransport =
  | { type: 'websocket'; socket: WebSocket }
  | { type: 'socketio'; socket: Socket };

const SOCKET_IO_PATH = import.meta.env.VITE_REALTIME_SOCKET_IO_PATH ?? '/realtime/socket.io';

const normalizeRealtimeBase = (value: string) => value.replace(/\/$/, '');

const coerceWebsocketBase = (value: string) => {
  if (value.startsWith('wss://') || value.startsWith('ws://')) {
    return normalizeRealtimeBase(value);
  }

  if (value.startsWith('https://')) {
    return normalizeRealtimeBase(`wss://${value.slice('https://'.length)}`);
  }

  if (value.startsWith('http://')) {
    return normalizeRealtimeBase(`ws://${value.slice('http://'.length)}`);
  }

  return null;
};

const convertWebsocketToHttp = (value: string) => {
  if (value.startsWith('wss://')) {
    return normalizeRealtimeBase(`https://${value.slice('wss://'.length)}`);
  }

  if (value.startsWith('ws://')) {
    return normalizeRealtimeBase(`http://${value.slice('ws://'.length)}`);
  }

  if (value.startsWith('https://') || value.startsWith('http://')) {
    return normalizeRealtimeBase(value);
  }

  return value;
};

const getRealtimeBases = () => {
  const defaultProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fallbackBase = normalizeRealtimeBase(`${defaultProtocol}//${window.location.host}`);

  const override = import.meta.env.VITE_REALTIME_URL;
  const primaryBase = override ? coerceWebsocketBase(override) ?? fallbackBase : fallbackBase;
  const primaryHttpBase = convertWebsocketToHttp(primaryBase);
  const fallbackHttpBase = convertWebsocketToHttp(fallbackBase);

  return {
    primaryWsBase: primaryBase,
    fallbackWsBase: fallbackBase,
    primaryHttpBase,
    fallbackHttpBase
  } as const;
};

const apiBase = import.meta.env.VITE_SITE_ORIGIN ? import.meta.env.VITE_SITE_ORIGIN.replace(/\/$/, '') : '';

const samplePaintBag = (): PaintCube[] => [
  { id: 'bag-red', color: 'red' },
  { id: 'bag-blue', color: 'blue' },
  { id: 'bag-green', color: 'green' },
  { id: 'bag-black', color: 'black' }
];

const normalizeGameId = (value: string) => value.replace(/.*\/lobby\//, '').trim();

const createJsonRequest = async (url: string, init: RequestInit) => {
  const target = apiBase ? `${apiBase}${url}` : url;
  const response = await fetch(target, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }
  return payload;
};

export const useLobbyState = () => {
  const {
    primaryWsBase,
    fallbackWsBase,
    primaryHttpBase,
    fallbackHttpBase
  } = useMemo(getRealtimeBases, []);
  const [realtimeBase, setRealtimeBase] = useState(primaryWsBase);
  const [realtimeHttpBase, setRealtimeHttpBase] = useState(primaryHttpBase);
  const [lobby, setLobby] = useState<LobbySnapshot | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<LobbyConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [gameId, setGameId] = useState('');
  const [playerId, setPlayerId] = useState('player-1');
  const [displayName, setDisplayName] = useState('Artist');

  const fallbackPair = useMemo(() => {
    if (fallbackWsBase && fallbackWsBase !== primaryWsBase) {
      return { ws: fallbackWsBase, http: fallbackHttpBase };
    }
    return null;
  }, [fallbackHttpBase, fallbackWsBase, primaryWsBase]);

  const [transportMode, setTransportMode] = useState<'websocket' | 'socketio'>('websocket');

  const lobbyTransportRef = useRef<LobbyTransport | null>(null);
  const gameTransportRef = useRef<GameTransport | null>(null);
  const [actionHistory, setActionHistory] = useState<GameActionSummary[]>([]);

  const tryFallbackRealtimeBase = useCallback(() => {
    if (fallbackPair && realtimeBase !== fallbackPair.ws) {
      setRealtimeBase(fallbackPair.ws);
      setRealtimeHttpBase(fallbackPair.http);
      return true;
    }
    return false;
  }, [fallbackPair, realtimeBase]);

  useEffect(() => {
    setTransportMode('websocket');
  }, [realtimeBase]);

  const updateLobby = useCallback((snapshot: LobbySnapshot) => {
    setLobby(snapshot);
    setGameId(snapshot.gameId);
    if (snapshot.phase === 'LOBBY') {
      setGameState(null);
    }
  }, []);

  const lobbyTransportIntentionalCloseRef = useRef(false);
  const gameTransportIntentionalCloseRef = useRef(false);

  const handleWebSocketFailure = useCallback(
    (context: 'lobby' | 'game') => {
      if (tryFallbackRealtimeBase()) {
        return;
      }
      setTransportMode('socketio');
      if (context === 'lobby') {
        setConnectionStatus('error');
        setError('Realtime lobby connection failed');
      } else {
        setError('Realtime game connection failed');
      }
    },
    [setConnectionStatus, setError, tryFallbackRealtimeBase]
  );

  const closeLobbyTransport = useCallback(() => {
    const transport = lobbyTransportRef.current;
    if (!transport) {
      return;
    }
    lobbyTransportIntentionalCloseRef.current = true;
    if (transport.type === 'websocket') {
      transport.socket.close();
    } else {
      transport.socket.off();
      transport.socket.disconnect();
    }
    lobbyTransportRef.current = null;
  }, []);

  const closeGameTransport = useCallback(() => {
    const transport = gameTransportRef.current;
    if (!transport) {
      return;
    }
    gameTransportIntentionalCloseRef.current = true;
    if (transport.type === 'websocket') {
      transport.socket.close();
    } else {
      transport.socket.off();
      transport.socket.disconnect();
    }
    gameTransportRef.current = null;
  }, []);

  const handleLobbyMessage = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== 'object') {
        setError('Failed to parse realtime message');
        setConnectionStatus('error');
        return;
      }
      const { type, payload } = raw as {
        type: string;
        payload: unknown;
      };
      if (type === 'LOBBY_STATE') {
        updateLobby(payload as LobbySnapshot);
        return;
      }
      if (type === 'GAME_STARTED') {
        setGameState(payload as GameState);
        return;
      }
      if (type === 'ERROR') {
        const message = (payload as { message: string })?.message ?? 'Realtime error';
        setError(message);
        setConnectionStatus('error');
      }
    },
    [updateLobby, setConnectionStatus, setError]
  );

  const handleGameServerMessage = useCallback(
    (message: GameRealtimeServerMessage) => {
      if (message.type === 'GAME_STATE_UPDATED') {
        setGameState(message.payload.state);
        if (message.payload.lastAction) {
          const summary = message.payload.lastAction;
          setActionHistory((previous) => [summary, ...previous].slice(0, 10));
        }
        return;
      }
      if (message.type === 'ERROR') {
        setError(message.payload.message);
      }
    },
    [setActionHistory, setGameState, setError]
  );

  const handleSocketIoFailure = useCallback(
    (context: 'lobby' | 'game') => {
      if (context === 'lobby') {
        setConnectionStatus('error');
        setError('Realtime lobby connection failed');
      } else {
        setError('Realtime game connection failed');
      }
    },
    [setConnectionStatus, setError]
  );

  const connectLobbyWebSocket = useCallback(() => {
    if (!gameId || !playerId) {
      setConnectionStatus('idle');
      closeLobbyTransport();
      return;
    }

    closeLobbyTransport();
    const wsUrl = `${realtimeBase}/realtime/lobby?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(
      playerId
    )}`;
    const socket = new WebSocket(wsUrl);
    lobbyTransportRef.current = { type: 'websocket', socket };
    setConnectionStatus('connecting');

    socket.onopen = () => {
      setConnectionStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleLobbyMessage(data);
      } catch {
        setError('Failed to parse realtime message');
        setConnectionStatus('error');
      }
    };

    socket.onerror = () => {
      handleWebSocketFailure('lobby');
    };

    socket.onclose = () => {
      if (lobbyTransportIntentionalCloseRef.current) {
        lobbyTransportIntentionalCloseRef.current = false;
        return;
      }
      handleWebSocketFailure('lobby');
    };
  }, [gameId, playerId, realtimeBase, handleLobbyMessage, handleWebSocketFailure, closeLobbyTransport]);

  const connectLobbySocketIo = useCallback(() => {
    if (!gameId || !playerId) {
      setConnectionStatus('idle');
      return;
    }

    closeLobbyTransport();
    const socket = io(`${realtimeHttpBase}/lobby`, {
      path: SOCKET_IO_PATH,
      transports: ['websocket', 'polling'],
      query: { gameId, playerId }
    });
    lobbyTransportRef.current = { type: 'socketio', socket };
    setConnectionStatus('connecting');

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setError(null);
    });
    socket.on('realtime_message', handleLobbyMessage);
    socket.on('connect_error', () => handleSocketIoFailure('lobby'));
    socket.on('disconnect', () => {
      if (lobbyTransportIntentionalCloseRef.current) {
        lobbyTransportIntentionalCloseRef.current = false;
        return;
      }
      handleSocketIoFailure('lobby');
    });
  }, [gameId, playerId, realtimeHttpBase, handleLobbyMessage, handleSocketIoFailure, closeLobbyTransport]);

  useEffect(() => {
    if (transportMode === 'websocket') {
      connectLobbyWebSocket();
      return () => {
        closeLobbyTransport();
      };
    }
    connectLobbySocketIo();
    return () => {
      closeLobbyTransport();
    };
  }, [transportMode, connectLobbyWebSocket, connectLobbySocketIo, closeLobbyTransport]);

  const connectGameWebSocket = useCallback(() => {
    if (!gameId || !playerId || !gameState) {
      closeGameTransport();
      return;
    }

    closeGameTransport();
    const wsUrl = `${realtimeBase}/realtime/game?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(
      playerId
    )}`;
    const socket = new WebSocket(wsUrl);
    gameTransportRef.current = { type: 'websocket', socket };

    socket.onopen = () => {
      setError(null);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GameRealtimeServerMessage;
        handleGameServerMessage(data);
      } catch {
        setError('Failed to parse realtime game message');
      }
    };

    socket.onerror = () => {
      handleWebSocketFailure('game');
    };

    socket.onclose = () => {
      if (gameTransportIntentionalCloseRef.current) {
        gameTransportIntentionalCloseRef.current = false;
        return;
      }
      handleWebSocketFailure('game');
    };
  }, [gameId, playerId, gameState, realtimeBase, handleGameServerMessage, handleWebSocketFailure, closeGameTransport]);

  const connectGameSocketIo = useCallback(() => {
    if (!gameId || !playerId || !gameState) {
      closeGameTransport();
      return;
    }

    closeGameTransport();
    const socket = io(`${realtimeHttpBase}/game`, {
      path: SOCKET_IO_PATH,
      transports: ['websocket', 'polling'],
      query: { gameId, playerId }
    });
    gameTransportRef.current = { type: 'socketio', socket };

    socket.on('connect', () => {
      setError(null);
    });
    socket.on('realtime_message', (message: GameRealtimeServerMessage) => {
      handleGameServerMessage(message);
    });
    socket.on('connect_error', () => handleSocketIoFailure('game'));
    socket.on('disconnect', () => {
      if (gameTransportIntentionalCloseRef.current) {
        gameTransportIntentionalCloseRef.current = false;
        return;
      }
      handleSocketIoFailure('game');
    });
  }, [gameId, playerId, gameState, realtimeHttpBase, handleGameServerMessage, handleSocketIoFailure, closeGameTransport]);

  useEffect(() => {
    if (!gameState) {
      closeGameTransport();
      setActionHistory([]);
      return;
    }

    if (transportMode === 'websocket') {
      connectGameWebSocket();
      return () => {
        closeGameTransport();
      };
    }

    connectGameSocketIo();
    return () => {
      closeGameTransport();
    };
  }, [transportMode, connectGameWebSocket, connectGameSocketIo, closeGameTransport, gameState]);

  const sendGameAction = useCallback((intent: GameActionIntent) => {
    const transport = gameTransportRef.current;
    if (!transport) {
      throw new Error('Game connection is not ready');
    }

    const message: GameRealtimeClientMessage = {
      type: 'GAME_ACTION',
      payload: intent
    };

    if (transport.type === 'websocket') {
      if (transport.socket.readyState !== WebSocket.OPEN) {
        throw new Error('Game connection is not ready');
      }
      transport.socket.send(JSON.stringify(message));
      return;
    }

    if (!transport.socket.connected) {
      throw new Error('Game connection is not ready');
    }

    transport.socket.emit('game_action', message);
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
    closeGameTransport();
    setActionHistory([]);
    setGameState(null);
  }, [closeGameTransport]);

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
