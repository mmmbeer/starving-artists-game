"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGame = exports.fetchLobby = exports.leaveGame = exports.joinGame = exports.createGame = void 0;
const game_1 = require("../game");
const createGame = (hostProfile) => {
    return game_1.lobbySessionManager.createSession(hostProfile);
};
exports.createGame = createGame;
const joinGame = (gameId, profile) => {
    return game_1.lobbySessionManager.joinGame(gameId, profile);
};
exports.joinGame = joinGame;
const leaveGame = (gameId, playerId) => {
    return game_1.lobbySessionManager.leaveGame(gameId, playerId);
};
exports.leaveGame = leaveGame;
const fetchLobby = (gameId) => {
    return game_1.lobbySessionManager.fetchLobby(gameId);
};
exports.fetchLobby = fetchLobby;
const startGame = async (gameId, playerId, payload) => {
    return game_1.lobbySessionManager.startGame(gameId, payload, playerId);
};
exports.startGame = startGame;
