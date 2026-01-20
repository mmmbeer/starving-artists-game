"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSessionManager = void 0;
const events_1 = require("events");
const types_1 = require("../types");
const GameSession_1 = require("./GameSession");
const sessionPersistence_1 = require("../db/sessionPersistence");
const canvases_1 = require("../db/canvases");
class GameSessionManager extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.sessions = new Map();
        this.nextSequence = 1;
    }
    createSession(host) {
        const gameId = `game-${this.nextSequence++}`;
        const session = new GameSession_1.GameSession(gameId, host);
        this.sessions.set(gameId, session);
        void (0, sessionPersistence_1.persistGameMetadata)(gameId, session.getHostId(), session.getState().phase);
        this.persistPlayer(session, host.id);
        const snapshot = session.getLobbySnapshot();
        this.emitLobbyUpdate(gameId, snapshot, 'created', host.id);
        return snapshot;
    }
    joinGame(gameId, profile) {
        const session = this.getSessionOrThrow(gameId);
        if (session.getState().phase !== types_1.GamePhase.LOBBY) {
            throw new Error('Game has already started');
        }
        const { snapshot, isReconnect } = session.addOrReconnectPlayer(profile);
        void (0, sessionPersistence_1.persistGameMetadata)(gameId, session.getHostId(), session.getState().phase);
        this.persistPlayer(session, profile.id);
        const reason = isReconnect ? 'reconnect' : 'join';
        this.emitLobbyUpdate(gameId, snapshot, reason, profile.id);
        return snapshot;
    }
    leaveGame(gameId, playerId) {
        const session = this.getSessionOrThrow(gameId);
        const snapshot = session.markPlayerDisconnected(playerId);
        void (0, sessionPersistence_1.persistGameMetadata)(gameId, session.getHostId(), session.getState().phase);
        this.persistPlayer(session, playerId);
        this.emitLobbyUpdate(gameId, snapshot, 'leave', playerId);
        return snapshot;
    }
    fetchLobby(gameId) {
        const session = this.getSessionOrThrow(gameId);
        return session.getLobbySnapshot();
    }
    fetchGameState(gameId) {
        const session = this.getSessionOrThrow(gameId);
        return session.getState();
    }
    isPlayerInGame(gameId, playerId) {
        const session = this.sessions.get(gameId);
        if (!session) {
            return false;
        }
        return session.hasPlayer(playerId);
    }
    async startGame(gameId, payload, requestedBy) {
        const session = this.getSessionOrThrow(gameId);
        const canvasDeck = await this.resolveCanvasDeck(gameId, payload);
        const payloadWithDeck = {
            ...payload,
            canvasDeck
        };
        const newState = session.startGame(payloadWithDeck, requestedBy);
        void (0, sessionPersistence_1.persistGameMetadata)(gameId, session.getHostId(), newState.phase);
        session.getState().players.forEach((player) => {
            this.persistPlayer(session, player.id);
        });
        this.emitLobbyUpdate(gameId, session.getLobbySnapshot(), 'start', requestedBy);
        this.emitGameStarted(gameId, newState);
        this.emitGameStateUpdated(gameId, newState);
        return newState;
    }
    applyAction(gameId, action, requestedBy) {
        const session = this.getSessionOrThrow(gameId);
        const playerId = this.getActionPlayerId(action);
        if (playerId && playerId !== requestedBy) {
            throw new Error('Player may only act on their own turn');
        }
        const timestamp = new Date().toISOString();
        const actionWithMeta = {
            ...action,
            meta: {
                ...(action.meta ?? {}),
                timestamp
            }
        };
        const nextState = session.applyAction(actionWithMeta);
        void (0, sessionPersistence_1.persistGameMetadata)(gameId, session.getHostId(), nextState.phase);
        const summary = playerId
            ? { playerId, actionType: action.type, timestamp }
            : undefined;
        this.emitGameStateUpdated(gameId, nextState, summary);
        return nextState;
    }
    destroySession(gameId) {
        this.sessions.delete(gameId);
    }
    hasSession(gameId) {
        return this.sessions.has(gameId);
    }
    getSessionOrThrow(gameId) {
        const session = this.sessions.get(gameId);
        if (!session) {
            throw new Error(`Game ${gameId} not found`);
        }
        return session;
    }
    emitLobbyUpdate(gameId, snapshot, reason, playerId) {
        this.emit('lobby-updated', { gameId, snapshot, reason, playerId });
    }
    emitGameStarted(gameId, state) {
        this.emit('game-started', { gameId, state });
    }
    emitGameStateUpdated(gameId, state, action) {
        this.emit('game-state-updated', { gameId, state, action });
    }
    persistPlayer(session, playerId) {
        const player = session
            .getState()
            .players.find((entry) => entry.id === playerId);
        if (!player) {
            return;
        }
        const record = {
            id: player.id,
            displayName: player.displayName,
            order: player.order,
            isConnected: player.isConnected
        };
        void (0, sessionPersistence_1.persistPlayerMembership)(session.getId(), record);
    }
    getActionPlayerId(action) {
        switch (action.type) {
            case 'DRAW_PAINT_CUBES':
            case 'BUY_CANVAS':
            case 'APPLY_PAINT_TO_CANVAS':
            case 'DECLARE_SELL_INTENT':
            case 'END_TURN':
                return action.payload.playerId;
            default:
                return undefined;
        }
    }
    async resolveCanvasDeck(gameId, payload) {
        if (payload.canvasDeckOverride && payload.canvasDeckOverride.length > 0) {
            return payload.canvasDeckOverride.map((canvas) => this.cloneCanvasDefinition(canvas));
        }
        if (payload.canvasDeck && payload.canvasDeck.length > 0) {
            return payload.canvasDeck.map((canvas) => this.cloneCanvasDefinition(canvas));
        }
        const definitions = await (0, canvases_1.fetchCanvasDefinitions)();
        if (definitions.length === 0) {
            throw new Error('No canvases available to build the deck');
        }
        return this.shuffleDefinitions(definitions, gameId);
    }
    cloneCanvasDefinition(canvas) {
        return {
            ...canvas,
            squares: canvas.squares.map((square) => ({
                ...square,
                position: { ...square.position }
            }))
        };
    }
    shuffleDefinitions(source, seedSource) {
        const seed = this.hashSeed(seedSource);
        const shuffled = source.map((definition) => this.cloneCanvasDefinition(definition));
        let current = seed;
        const nextRandom = () => {
            current = (current * 9301 + 49297) % 233280;
            return current / 233280;
        };
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(nextRandom() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    hashSeed(value) {
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
            hash = (hash * 31 + value.charCodeAt(index)) % 1000000000;
        }
        return hash || 1;
    }
}
exports.GameSessionManager = GameSessionManager;
