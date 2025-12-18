import type { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { lobbySessionManager, GameStartedEvent, LobbyEvent, LobbyEventReason } from '../game';
import type { LobbySnapshot } from '../../../shared/types/lobby';

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

const send = (socket: WebSocket, message: RealtimeMessage) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const startLobbyRealtime = (server: HttpServer) => {
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

  const addToRoom = (gameId: string, socket: WebSocket) => {
    socketToRoom.set(socket, gameId);
    const set = rooms.get(gameId) ?? new Set();
    set.add(socket);
    rooms.set(gameId, set);
  };

  const removeFromRoom = (socket: WebSocket) => {
    const roomId = socketToRoom.get(socket);
    if (!roomId) {
      return;
    }
    socketToRoom.delete(socket);
    const sockets = rooms.get(roomId);
    if (!sockets) {
      return;
    }
    sockets.delete(socket);
    if (sockets.size === 0) {
      rooms.delete(roomId);
    }
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
      const snapshot = lobbySessionManager.fetchLobby(gameId);
      const hasPlayer = snapshot.players.some((player) => player.id === playerId);
      if (!hasPlayer) {
        send(socket, { type: 'ERROR', payload: { message: 'Player not registered in this lobby' } });
        socket.close();
        return;
      }

      addToRoom(gameId, socket);
      send(socket, { type: 'LOBBY_STATE', payload: snapshot });
    } catch (error) {
      send(socket, { type: 'ERROR', payload: { message: (error as Error).message } });
      socket.close();
    }

    socket.on('close', () => {
      removeFromRoom(socket);
    });
  });

  const stop = () => {
    lobbySessionManager.off('lobby-updated', lobbyListener);
    lobbySessionManager.off('game-started', gameStartedListener);
    wss.close();
  };

  return { stop };
};
