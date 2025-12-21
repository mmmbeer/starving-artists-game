import type { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { Socket, Server as SocketIOServer } from 'socket.io';
import { lobbySessionManager, GameStateUpdatedEvent } from '../game';
import type { GameAction } from '../game/actions';
import type { GameActionIntent } from '../../../shared/types/gameActions';
import type { GameRealtimeClientMessage, GameRealtimeServerMessage } from '../../../shared/types/realtime';
import type { PlayerId } from '../../../shared/types/common';
import type { RealtimeHealthSnapshot } from './health';
import { countConnections, countActiveGamesAcrossRooms } from './health';
import { createRoomRegistry } from './roomRegistry';
import type { RealtimeConfig } from '../config/env';

const ROOM_PATH = '/realtime/game';

type RealtimeMessage = GameRealtimeServerMessage;
type GameActionMessage = GameRealtimeClientMessage;

const sendWebSocketMessage = (socket: WebSocket, message: RealtimeMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

const sendSocketIoMessage = (socket: Socket, message: RealtimeMessage) => {
  socket.emit('realtime_message', message);
};

const assertNever = (value: never): never => {
  throw new Error(`Unhandled action intent ${JSON.stringify(value)}`);
};

const buildGameAction = (intent: GameActionIntent, playerId: PlayerId): GameAction => {
  switch (intent.type) {
    case 'DRAW_PAINT_CUBES':
      return { type: 'DRAW_PAINT_CUBES', payload: { playerId, count: intent.payload.count } };
    case 'BUY_CANVAS':
      return { type: 'BUY_CANVAS', payload: { playerId, slotIndex: intent.payload.slotIndex } };
    case 'APPLY_PAINT_TO_CANVAS':
      return {
        type: 'APPLY_PAINT_TO_CANVAS',
        payload: {
          playerId,
          canvasId: intent.payload.canvasId,
          squareId: intent.payload.squareId,
          cubeId: intent.payload.cubeId
        }
      };
    case 'END_TURN':
      return { type: 'END_TURN', payload: { playerId } };
    case 'DECLARE_SELL_INTENT':
      return { type: 'DECLARE_SELL_INTENT', payload: { playerId, canvasIds: intent.payload.canvasIds } };
    default:
      return assertNever(intent);
  }
};

const parseQueryParam = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

const handleSocketIoError = (socket: Socket, message: string) => {
  sendSocketIoMessage(socket, { type: 'ERROR', payload: { message } });
  socket.disconnect(true);
};

export const startGameRealtime = (
  server: HttpServer,
  realtimeConfig: RealtimeConfig,
  socketIoServer: SocketIOServer | null
) => {
  const websocketRegistry = createRoomRegistry<WebSocket>();
  const socketIoRegistry = createRoomRegistry<Socket>();
  let lastBroadcastAt: string | null = null;

  const wss = realtimeConfig.enableWebSocket
    ? new WebSocketServer({
        server,
        path: ROOM_PATH
      })
    : null;

  const gameNamespace =
    realtimeConfig.enableSocketIo && socketIoServer ? socketIoServer.of('/game') : null;

  if (realtimeConfig.enableSocketIo && !socketIoServer) {
    throw new Error('Socket.IO server required when socket.io realtime is enabled');
  }

  const broadcastToWebSockets = (gameId: string, message: RealtimeMessage) => {
    const sockets = websocketRegistry.rooms.get(gameId);
    if (!sockets) {
      return;
    }
    sockets.forEach((socket) => sendWebSocketMessage(socket, message));
  };

  const broadcastToSocketIo = (gameId: string, message: RealtimeMessage) => {
    const sockets = socketIoRegistry.rooms.get(gameId);
    if (!sockets) {
      return;
    }
    sockets.forEach((socket) => sendSocketIoMessage(socket, message));
  };

  const broadcast = (gameId: string, message: RealtimeMessage) => {
    broadcastToWebSockets(gameId, message);
    broadcastToSocketIo(gameId, message);
    lastBroadcastAt = new Date().toISOString();
  };

  const gameStateListener = (event: GameStateUpdatedEvent) => {
    broadcast(event.gameId, {
      type: 'GAME_STATE_UPDATED',
      payload: {
        state: event.state,
        lastAction: event.action
      }
    });
  };

  lobbySessionManager.on('game-state-updated', gameStateListener);

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
      const hasSession = lobbySessionManager.hasSession(gameId);
      if (!hasSession || !lobbySessionManager.isPlayerInGame(gameId, playerId)) {
        sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'Player not registered for this game' } });
        socket.close();
        return;
      }

      websocketRegistry.add(gameId, socket);
      const state = lobbySessionManager.fetchGameState(gameId);
      sendWebSocketMessage(socket, {
        type: 'GAME_STATE_UPDATED',
        payload: {
          state
        }
      });
    } catch (error) {
      sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: (error as Error).message } });
      socket.close();
      return;
    }

    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as GameActionMessage;
        if (data.type !== 'GAME_ACTION') {
          return;
        }

        try {
          const action = buildGameAction(data.payload, playerId);
          lobbySessionManager.applyAction(gameId, action, playerId);
        } catch (actionError) {
          sendWebSocketMessage(socket, {
            type: 'ERROR',
            payload: { message: (actionError as Error).message }
          });
        }
      } catch {
        sendWebSocketMessage(socket, { type: 'ERROR', payload: { message: 'Invalid message format' } });
      }
    });

    socket.on('close', () => {
      websocketRegistry.remove(socket);
    });
  };

  if (wss) {
    wss.on('connection', (socket, request) => {
      handleWebSocketConnection(socket, request.url ?? null);
    });
  }

  const handleSocketIoConnection = (socket: Socket) => {
    const gameId = parseQueryParam(socket.handshake.query.gameId);
    const playerId = parseQueryParam(socket.handshake.query.playerId);

    if (!gameId || !playerId) {
      handleSocketIoError(socket, 'gameId and playerId are required');
      return;
    }

    try {
      const hasSession = lobbySessionManager.hasSession(gameId);
      if (!hasSession || !lobbySessionManager.isPlayerInGame(gameId, playerId)) {
        handleSocketIoError(socket, 'Player not registered for this game');
        return;
      }

      socketIoRegistry.add(gameId, socket);
      const state = lobbySessionManager.fetchGameState(gameId);
      sendSocketIoMessage(socket, {
        type: 'GAME_STATE_UPDATED',
        payload: {
          state
        }
      });
    } catch (error) {
      handleSocketIoError(socket, (error as Error).message);
      return;
    }

    socket.on('game_action', (data: GameActionMessage | unknown) => {
      if ((data as GameRealtimeClientMessage).type !== 'GAME_ACTION') {
        return;
      }

      try {
        const action = buildGameAction((data as GameRealtimeClientMessage).payload, playerId);
        lobbySessionManager.applyAction(gameId, action, playerId);
      } catch (actionError) {
        sendSocketIoMessage(socket, {
          type: 'ERROR',
          payload: { message: (actionError as Error).message }
        });
      }
    });

    socket.on('disconnect', () => {
      socketIoRegistry.remove(socket);
    });
  };

  if (gameNamespace) {
    gameNamespace.on('connection', handleSocketIoConnection);
  }

  const stop = () => {
    lobbySessionManager.off('game-state-updated', gameStateListener);
    wss?.close();
    if (gameNamespace) {
      gameNamespace.off('connection', handleSocketIoConnection);
    }
  };

  const getStats = (): RealtimeHealthSnapshot => {
    const activeGames = countActiveGamesAcrossRooms(
      websocketRegistry.rooms,
      socketIoRegistry.rooms
    );
    const activeConnections =
      countConnections(websocketRegistry.rooms) + countConnections(socketIoRegistry.rooms);
    return {
      activeGames,
      activeConnections,
      lastBroadcastAt
    };
  };

  return { stop, getStats };
};
