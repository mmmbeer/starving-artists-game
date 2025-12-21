export type RoomRegistry<SocketType> = {
  rooms: Map<string, Set<SocketType>>;
  add: (roomId: string, socket: SocketType) => void;
  remove: (socket: SocketType) => void;
  getActiveGames: () => number;
  getTotalConnections: () => number;
};

export const createRoomRegistry = <SocketType>(): RoomRegistry<SocketType> => {
  const rooms = new Map<string, Set<SocketType>>();
  const socketToRoom = new Map<SocketType, string>();

  const add = (roomId: string, socket: SocketType) => {
    const set = rooms.get(roomId) ?? new Set<SocketType>();
    set.add(socket);
    rooms.set(roomId, set);
    socketToRoom.set(socket, roomId);
  };

  const remove = (socket: SocketType) => {
    const roomId = socketToRoom.get(socket);
    if (!roomId) {
      return;
    }

    const set = rooms.get(roomId);
    if (!set) {
      return;
    }

    set.delete(socket);
    socketToRoom.delete(socket);
    if (set.size === 0) {
      rooms.delete(roomId);
    }
  };

  const getActiveGames = () => rooms.size;

  const getTotalConnections = () => {
    let total = 0;
    rooms.forEach((set) => {
      total += set.size;
    });
    return total;
  };

  return {
    rooms,
    add,
    remove,
    getActiveGames,
    getTotalConnections
  };
};
