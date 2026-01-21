"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayerScore = updatePlayerScore;
exports.checkWinCondition = checkWinCondition;
exports.determineWinnerByStarvation = determineWinnerByStarvation;
exports.declareWinner = declareWinner;
exports.getLeaderboard = getLeaderboard;
// Score tracking and win condition service
const playerDb = __importStar(require("../database/playerDb"));
const gameDb = __importStar(require("../database/gameDb"));
const constants_1 = require("../utils/constants");
async function updatePlayerScore(playerId, pointsToAdd) {
    const player = await playerDb.getPlayer(playerId);
    if (!player)
        throw new Error('Player not found');
    const newScore = player.score + pointsToAdd;
    await playerDb.updatePlayerScore(playerId, newScore);
    return newScore;
}
async function checkWinCondition(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    const playerCount = players.length;
    if (playerCount < 2 || playerCount > 4) {
        return { won: false, winner: null };
    }
    const winCondition = constants_1.WIN_CONDITIONS[playerCount];
    // Check for painting count win
    for (const player of players) {
        if (player.paintings_completed >= winCondition.paintings) {
            return {
                won: true,
                winner: player,
                reason: `Completed ${winCondition.paintings} paintings`,
            };
        }
    }
    // Check for points win
    for (const player of players) {
        if (player.score >= winCondition.points) {
            return {
                won: true,
                winner: player,
                reason: `Reached ${winCondition.points} points`,
            };
        }
    }
    return { won: false, winner: null };
}
async function determineWinnerByStarvation(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    // Sort by score, then paintings, then food earned
    const sorted = [...players].sort((a, b) => {
        if (a.score !== b.score)
            return b.score - a.score;
        if (a.paintings_completed !== b.paintings_completed) {
            return b.paintings_completed - a.paintings_completed;
        }
        if (a.food_earned !== b.food_earned) {
            return b.food_earned - a.food_earned;
        }
        // Final tiebreaker: paint cube count (would need to query)
        return 0;
    });
    return sorted[0];
}
async function declareWinner(gameId, winnerId) {
    await gameDb.setGameWinner(gameId, winnerId);
}
async function getLeaderboard(gameId) {
    const players = await playerDb.getGamePlayers(gameId);
    return [...players].sort((a, b) => {
        if (a.score !== b.score)
            return b.score - a.score;
        if (a.paintings_completed !== b.paintings_completed) {
            return b.paintings_completed - a.paintings_completed;
        }
        return b.food_earned - a.food_earned;
    });
}
