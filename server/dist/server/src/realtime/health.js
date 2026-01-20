"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countActiveGamesAcrossRooms = exports.countConnections = exports.getRealtimeHealth = exports.setRealtimeHealthProviders = void 0;
const defaultSnapshot = () => ({
    activeGames: 0,
    activeConnections: 0,
    lastBroadcastAt: null
});
const emptyHealth = () => defaultSnapshot();
let lobbyHealthProvider = emptyHealth;
let gameHealthProvider = emptyHealth;
const setRealtimeHealthProviders = (lobbyProvider, gameProvider) => {
    lobbyHealthProvider = lobbyProvider;
    gameHealthProvider = gameProvider;
};
exports.setRealtimeHealthProviders = setRealtimeHealthProviders;
const getRealtimeHealth = () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lobby: lobbyHealthProvider(),
    game: gameHealthProvider()
});
exports.getRealtimeHealth = getRealtimeHealth;
const countConnections = (rooms) => {
    let total = 0;
    rooms.forEach((sockets) => {
        total += sockets.size;
    });
    return total;
};
exports.countConnections = countConnections;
const countActiveGamesAcrossRooms = (...rooms) => {
    const uniqueGames = new Set();
    rooms.forEach((roomMap) => {
        roomMap.forEach((_value, gameId) => uniqueGames.add(gameId));
    });
    return uniqueGames.size;
};
exports.countActiveGamesAcrossRooms = countActiveGamesAcrossRooms;
