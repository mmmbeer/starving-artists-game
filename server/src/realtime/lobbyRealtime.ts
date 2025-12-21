import type { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { Socket, Server as SocketIOServer } from 'socket.io';
import { lobbySessionManager, GameStartedEvent, LobbyEvent, LobbyEventReason } from '../game';
import type { LobbySnapshot } from '../../../shared/types/lobby';
import type { RealtimeHealthSnapshot } from './health';
import { countConnections, countActiveGamesAcrossRooms } from './health';
import { createRoomRegistry } from './roomRegistry';
import type { RealtimeConfig } from '../config/env';

const ROOM_PATH = '/realtime/lobby';

type LobbyStateMessage = {
  type: 'LOBBY_STATE';
  payload: LobbySnapshot;
  reason?: LobbyEventReason;
};

type GameStartedMessage = {
  type: 'GAME_STARTED';
  payload: GameStartedEvent['state'];
};

type ErrorMessage = {
  type: 'ERROR';
  payload: { message: string };
};

type RealtimeMessage = LobbyStateMessage | GameStartedMessage | ErrorMessage;

const sendWebSocketMessage = (socket: WebSocket, message: RealtimeMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const parseQueryParam = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

const buildSocketError = (socket: Socket, message: string) => {
  socket.emit('realtime_message', { type: 'ERROR', payload: { message } });
  socket.disconnect(true);
};

export const startLobbyRealtime = (
  server: HttpServer,
  realtimeConfig: RealtimeConfig,
  socketIoServer: SocketIOServer | null
) => {
  const wssRegistry = createRoomRegistry<WebSocket>();
  const ioRegistry = createRoomRegistry<Socket>();
  let lastBroadcastAt: string | null = null;

  const wss = realtimeConfig.enableWebSocket
    ? new WebSocketServer({
        server,
        path: ROOM_PATH
      })
    : null;

  const lobbyNamespace =
    realtimeConfig.enableSocketIo && socketIoServer ? socketIoServer.of('/lobby') : null;

  if (realtimeConfig.enableSocketIo && !socketIoServer) {
    throw new Error('Socket.IO server required when socket.io realtime is enabled');
  }

  const broadcastToWebSockets = (gameId: string, message: RealtimeMessage) => {
    const sockets = wssRegistry.rooms.get(gameId);
    if (!sockets) {
      return;
    }
    sockets.forEach((socket) => sendWebSocketMessage(socket, message));
  };

  const broadcastToSocketIo = (gameId: string, message: RealtimeMessage) => {
    const sockets = ioRegistry.rooms.get(gameId);
    if (!sockets) {
      return;
    }
    sockets.forEach((socket) => {
      socket.emit('realtime_message', message);
    });
  };

  const broadcast = (gameId: string, message: RealtimeMessage) => {
    broadcastToWebSockets(gameId, message);
    broadcastToSocketIo(gameId, message);
    lastBroadcastAt = new Date().toISOString();
  };

  const lobbyListener = (event: LobbyEvent) => {
    broadcast(event.gameId, {
      type: 'LOBBY_STATE',
      payload: event.snapshot,
      reason: event.reason
    });
  };

  const gameStartedListener = (event: GameStartedEvent) => {
    broadcast(event.gameId, {
      type: 'GAME_STARTED',
      payload: event.state
    });
  };

  lobbySessionManager.on('lobby-updated', lobbyListener);
  lobbySessionManager.on('game-started', gameStartedListener);

  const handleWebSocketConnection = (socket: WebSocket, requestUrl: string | null) => {
    const url = requestUrl ? new URL(requestUrl, 'http://localhost') : null;
    const gameId = url?.searchParams.get('gameId');
    const playerId = url?.searchParams.get('playerId');

    if (!gameId || !playerId) {
      sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'gameId and playerId are required' } });
      socket.close();
      return;
    }

    try {
      const snapshot = lobbySessionManager.fetchLobby(gameId);
      const hasPlayer = snapshot.players.some((player) => player.id === playerId);
      if (!hasPlayer) {
        sendWebSocketMessage(socket, {
          type: 'ERROR',
          payload: { message: 'Player not registered in this lobby' }
        });
        socket.close();
        return;
      }

      wssRegistry.add(gameId, socket);
      sendWebSocketMessage(socket, { type: 'LOBBY_STATE', payload: snapshot });
    } catch (error) {
      sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: (error as Error).message } });
      socket.close();
    }
  };

  if (wss) {
    wss.on('connection', (socket, request) => {
      handleWebSocketConnection(socket, request.url ?? null);

      socket.on('close', () => {
        wssRegistry.remove(socket);
      });
    });
  }

  const handleSocketIoConnection = (socket: Socket) => {
    const gameId = parseQueryParam(socket.handshake.query.gameId);
    const playerId = parseQueryParam(socket.handshake.query.playerId);

    if (!gameId || !playerId) {
      buildSocketError(socket, 'gameId and playerId are required');
      return;
    }

    try {
      const snapshot = lobbySessionManager.fetchLobby(gameId);
      const hasPlayer = snapshot.players.some((player) => player.id === playerId);
      if (!hasPlayer) {
        buildSocketError(socket, 'Player not registered in this lobby');
        return;
      }

      ioRegistry.add(gameId, socket);
      socket.emit('realtime_message', { type: 'LOBBY_STATE', payload: snapshot });
    } catch (error) {
      buildSocketError(socket, (error as Error).message);
    }

    socket.on('disconnect', () => {
      ioRegistry.remove(socket);
    });
  };

  if (lobbyNamespace) {
    lobbyNamespace.on('connection', handleSocketIoConnection);
  }

  const stop = () => {
    lobbySessionManager.off('lobby-updated', lobbyListener);
    lobbySessionManager.off('game-started', gameStartedListener);
    wss?.close();
    if (lobbyNamespace) {
      lobbyNamespace.off('connection', handleSocketIoConnection);
    }
  };

  const getStats = (): RealtimeHealthSnapshot => {
    const activeGames = countActiveGamesAcrossRooms(wssRegistry.rooms, ioRegistry.rooms);
    const activeConnections =
      countConnections(wssRegistry.rooms) + countConnections(ioRegistry.rooms);
    return {
      activeGames,
      activeConnections,
      lastBroadcastAt
    };
  };

  return { stop, getStats };
};
