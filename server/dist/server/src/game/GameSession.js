"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const types_1 = require("../types");
const reducer_1 = require("./reducer");
const MIN_PLAYERS = 1;
const MAX_PLAYERS = 4;
const createTimestamp = () => new Date().toISOString();
const buildEmptyGameState = (gameId) => {
    const timestamp = createTimestamp();
    return {
        id: gameId,
        phase: types_1.GamePhase.LOBBY,
        players: [],
        turnOrder: [],
        currentPlayerIndex: 0,
        turn: {
            order: [],
            currentPlayerIndex: 0,
            actionsTakenThisPhase: 0
        },
        day: {
            dayNumber: 1,
            hasNutritionApplied: false
        },
        canvasMarket: {
            slots: []
        },
        paintMarket: {
            cubes: [],
            lastUpdated: timestamp
        },
        paintBag: [],
        canvasDeck: [],
        sellIntents: {},
        firstPlayerId: undefined,
        createdAt: timestamp,
        updatedAt: timestamp
    };
};
const toPlayerView = (player) => ({
    id: player.id,
    displayName: player.displayName,
    order: player.order,
    isConnected: player.isConnected
});
class GameSession {
    constructor(gameId, host) {
        this.gameId = gameId;
        this.joinLink = `/lobby/${gameId}`;
        this.hostId = host.id;
        this.state = buildEmptyGameState(gameId);
        this.addOrReconnectPlayer(host);
    }
    getId() {
        return this.gameId;
    }
    getHostId() {
        return this.hostId;
    }
    getState() {
        return this.state;
    }
    isLobbyFull() {
        return this.state.players.length >= MAX_PLAYERS;
    }
    hasPlayer(playerId) {
        return this.state.players.some((player) => player.id === playerId);
    }
    getLobbySnapshot() {
        const sortedPlayers = [...this.state.players].sort((a, b) => a.order - b.order);
        return {
            gameId: this.gameId,
            hostId: this.hostId,
            phase: this.state.phase,
            players: sortedPlayers.map(toPlayerView),
            createdAt: this.state.createdAt,
            updatedAt: this.state.updatedAt,
            joinLink: this.joinLink,
            readiness: {
                canStart: this.canStartGame(),
                isLobbyFull: this.state.players.length >= MAX_PLAYERS,
                playerCount: this.state.players.length,
                minPlayers: MIN_PLAYERS,
                maxPlayers: MAX_PLAYERS
            }
        };
    }
    addOrReconnectPlayer(profile) {
        const existing = this.state.players.find((player) => player.id === profile.id);
        if (existing) {
            existing.displayName = profile.displayName;
            existing.isConnected = true;
            this.touch();
            return { snapshot: this.getLobbySnapshot(), isReconnect: true };
        }
        if (this.isLobbyFull()) {
            throw new Error('Lobby is full');
        }
        const order = this.state.players.length + 1;
        const newPlayer = {
            id: profile.id,
            displayName: profile.displayName,
            order,
            nutrition: 5,
            score: 0,
            isConnected: true,
            studio: {
                paintCubes: [],
                canvases: []
            }
        };
        this.state.players.push(newPlayer);
        this.state.firstPlayerId = this.state.firstPlayerId ?? newPlayer.id;
        this.touch();
        return { snapshot: this.getLobbySnapshot(), isReconnect: false };
    }
    markPlayerDisconnected(playerId) {
        const player = this.state.players.find((entry) => entry.id === playerId);
        if (!player) {
            throw new Error(`Player ${playerId} not connected to game ${this.gameId}`);
        }
        player.isConnected = false;
        this.touch();
        return this.getLobbySnapshot();
    }
    startGame(payload, requestedBy) {
        if (requestedBy !== this.hostId) {
            throw new Error('Only the host can start the game');
        }
        if (this.state.phase !== types_1.GamePhase.LOBBY) {
            throw new Error('Game has already started');
        }
        if (this.state.players.length < MIN_PLAYERS) {
            throw new Error(`At least ${MIN_PLAYERS} player(s) required to start`);
        }
        const timestamp = payload.timestamp ?? createTimestamp();
        const playerSetups = this.buildPlayerSetups();
        const turnOrder = payload.turnOrder ?? playerSetups.map((player) => player.id);
        const desiredFirstPlayer = payload.firstPlayerId ?? turnOrder[0];
        if (!payload.canvasDeck || payload.canvasDeck.length === 0) {
            throw new Error('Canvas deck must contain cards before starting the game');
        }
        const initializePayload = {
            gameId: this.gameId,
            timestamp,
            players: playerSetups,
            turnOrder,
            paintBag: payload.paintBag.map((cube) => ({ ...cube })),
            canvasDeck: payload.canvasDeck.map((canvas) => ({ ...canvas })),
            initialPaintMarket: payload.initialPaintMarket?.map((cube) => ({ ...cube })),
            initialMarketSize: payload.initialMarketSize,
            firstPlayerId: desiredFirstPlayer
        };
        const initializeAction = {
            type: 'INITIALIZE_GAME',
            payload: initializePayload
        };
        const initResult = (0, reducer_1.gameReducer)(undefined, initializeAction);
        if ('error' in initResult) {
            throw new Error(initResult.error.message);
        }
        const advanceAction = {
            type: 'ADVANCE_PHASE',
            payload: { targetPhase: types_1.GamePhase.MORNING },
            meta: { timestamp }
        };
        const advanceResult = (0, reducer_1.gameReducer)(initResult.nextState, advanceAction);
        if ('error' in advanceResult) {
            throw new Error(advanceResult.error.message);
        }
        this.state = advanceResult.nextState;
        return this.state;
    }
    applyAction(action) {
        const result = (0, reducer_1.gameReducer)(this.state, action);
        if ('error' in result) {
            throw new Error(result.error.message);
        }
        this.state = result.nextState;
        return this.state;
    }
    buildPlayerSetups() {
        return [...this.state.players]
            .sort((a, b) => a.order - b.order)
            .map((player) => ({
            id: player.id,
            displayName: player.displayName,
            order: player.order,
            nutrition: player.nutrition,
            score: player.score,
            studioCubes: player.studio.paintCubes
        }));
    }
    canStartGame() {
        return this.state.phase === types_1.GamePhase.LOBBY && this.state.players.length >= MIN_PLAYERS;
    }
    touch() {
        this.state = {
            ...this.state,
            updatedAt: createTimestamp()
        };
    }
}
exports.GameSession = GameSession;
