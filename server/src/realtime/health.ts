export type RealtimeHealthSnapshot = {
  activeGames: number;
  activeConnections: number;
  lastBroadcastAt: string | null;
};

const defaultSnapshot = (): RealtimeHealthSnapshot => ({
  activeGames: 0,
  activeConnections: 0,
  lastBroadcastAt: null
});

const emptyHealth = (): RealtimeHealthSnapshot => defaultSnapshot();

let lobbyHealthProvider: () => RealtimeHealthSnapshot = emptyHealth;
let gameHealthProvider: () => RealtimeHealthSnapshot = emptyHealth;

export const setRealtimeHealthProviders = (
  lobbyProvider: () => RealtimeHealthSnapshot,
  gameProvider: () => RealtimeHealthSnapshot
) => {
  lobbyHealthProvider = lobbyProvider;
  gameHealthProvider = gameProvider;
};

export const getRealtimeHealth = () => ({
  status: 'ok' as const,
  timestamp: new Date().toISOString(),
  lobby: lobbyHealthProvider(),
  game: gameHealthProvider()
});

export const countConnections = (rooms: Map<string, Set<unknown>>) => {
  let total = 0;
  rooms.forEach((sockets) => {
    total += sockets.size;
  });
  return total;
};

export const countActiveGamesAcrossRooms = (...rooms: Map<string, Set<unknown>>[]) => {
  const uniqueGames = new Set<string>();
  rooms.forEach((roomMap) => {
    roomMap.forEach((_value, gameId) => uniqueGames.add(gameId));
  });
  return uniqueGames.size;
};
