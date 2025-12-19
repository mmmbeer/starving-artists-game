import type WebSocket from 'ws';

export type RealtimeHealthSnapshot = {
  activeGames: number;
  activeConnections: number;
  lastBroadcastAt: string | null;
};

export const countWebSocketConnections = (rooms: Map<string, Set<WebSocket>>) => {
  let total = 0;
  rooms.forEach((sockets) => {
    total += sockets.size;
  });
  return total;
};
