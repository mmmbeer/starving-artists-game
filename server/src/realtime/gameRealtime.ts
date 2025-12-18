import type { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { lobbySessionManager, GameStateUpdatedEvent } from '../game';
import type { GameAction } from '../game/actions';
import type { GameActionIntent } from '../../../shared/types/gameActions';
import type { GameRealtimeClientMessage, GameRealtimeServerMessage } from '../../../shared/types/realtime';
import type { GameState } from '../../../shared/types/game';
import type { PlayerId } from '../../../shared/types/common';

const ROOM_PATH = '/realtime/game';

type RealtimeMessage = GameRealtimeServerMessage;

type GameActionMessage = GameRealtimeClientMessage;

const send = (socket: WebSocket, message: RealtimeMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
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
      throw new Error(`Unsupported action type ${intent.type}`);
  }
};

const addToRoom = (rooms: Map<string, Set<WebSocket>>, gameId: string, socket: WebSocket) => {
  const set = rooms.get(gameId) ?? new Set();
  set.add(socket);
  rooms.set(gameId, set);
};

const removeFromRoom = (rooms: Map<string, Set<WebSocket>>, socketToRoom: Map<WebSocket, string>, socket: WebSocket) => {
  const roomId = socketToRoom.get(socket);
  if (!roomId) {
    return;
  }

  const sockets = rooms.get(roomId);
  if (!sockets) {
    return;
  }

  sockets.delete(socket);
  socketToRoom.delete(socket);
  if (sockets.size === 0) {
    rooms.delete(roomId);
  }
};

export const startGameRealtime = (server: HttpServer) => {
  const rooms = new Map<string, Set<WebSocket>>();
  const socketToRoom = new Map<WebSocket, string>();

  const wss = new WebSocketServer({
    server,
    path: ROOM_PATH
  });

  const broadcast = (gameId: string, message: RealtimeMessage) => {
    const sockets = rooms.get(gameId);
    if (!sockets) {
      return;
    }
    sockets.forEach((socket) => send(socket, message));
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

  wss.on('connection', (socket, request) => {
    const url = request.url ? new URL(request.url, 'http://localhost') : null;
    const gameId = url?.searchParams.get('gameId');
    const playerId = url?.searchParams.get('playerId');

    if (!gameId || !playerId) {
      send(socket, { type: 'ERROR', payload: { message: 'gameId and playerId are required' } });
      socket.close();
      return;
    }

    try {
      const hasSession = lobbySessionManager.hasSession(gameId);
      if (!hasSession || !lobbySessionManager.isPlayerInGame(gameId, playerId)) {
        send(socket, { type: 'ERROR', payload: { message: 'Player not registered for this game' } });
        socket.close();
        return;
      }

      addToRoom(rooms, gameId, socket);
      socketToRoom.set(socket, gameId);
      const state = lobbySessionManager.fetchGameState(gameId);
      send(socket, {
        type: 'GAME_STATE_UPDATED',
        payload: {
          state
        }
      });
    } catch (error) {
      send(socket, { type: 'ERROR', payload: { message: (error as Error).message } });
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
          send(socket, {
            type: 'ERROR',
            payload: { message: (actionError as Error).message }
          });
        }
      } catch {
        send(socket, { type: 'ERROR', payload: { message: 'Invalid message format' } });
      }
    });

    socket.on('close', () => {
      removeFromRoom(rooms, socketToRoom, socket);
    });
  });

  const stop = () => {
    lobbySessionManager.off('game-state-updated', gameStateListener);
    wss.close();
  };

  return { stop };
};
