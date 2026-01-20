"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoomRegistry = void 0;
const createRoomRegistry = () => {
    const rooms = new Map();
    const socketToRoom = new Map();
    const add = (roomId, socket) => {
        const set = rooms.get(roomId) ?? new Set();
        set.add(socket);
        rooms.set(roomId, set);
        socketToRoom.set(socket, roomId);
    };
    const remove = (socket) => {
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
exports.createRoomRegistry = createRoomRegistry;
