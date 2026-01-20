"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameReducer = void 0;
const types_1 = require("../types");
const validators_1 = require("./validators");
const utils_1 = require("./utils");
const snapshots_1 = require("./snapshots");
const TurnController_1 = require("./TurnController");
const slotCost = (index) => index + 1;
const finalizePlayerAction = (state, timestamp) => {
    const { nextState, phaseCompleted } = (0, TurnController_1.advanceTurnAfterAction)(state);
    let finalState = { ...nextState, updatedAt: timestamp };
    if (phaseCompleted) {
        finalState = (0, TurnController_1.transitionPhase)(finalState, { timestamp });
    }
    (0, snapshots_1.storeSnapshot)(finalState);
    return { nextState: finalState };
};
const buildMarket = (canvasStates, timestamp, size) => {
    const initialSlots = [];
    for (let index = 0; index < size && index < canvasStates.length; index += 1) {
        initialSlots.push({
            slotIndex: index,
            canvas: canvasStates[index],
            cost: slotCost(index)
        });
    }
    const remainingDeck = canvasStates.slice(size);
    return { slots: initialSlots, remainingDeck };
};
const handleInitializeGame = (action) => {
    const { payload } = action;
    const timestamp = payload.timestamp;
    const canvasStates = payload.canvasDeck.map((definition) => (0, utils_1.createCanvasState)(definition, timestamp));
    const marketSize = Math.min(payload.initialMarketSize ?? 3, canvasStates.length);
    const { slots, remainingDeck } = buildMarket(canvasStates, timestamp, marketSize);
    const players = payload.players.map((player, index) => ({
        id: player.id,
        displayName: player.displayName,
        order: player.order ?? index + 1,
        nutrition: player.nutrition ?? 5,
        score: player.score ?? 0,
        isConnected: true,
        studio: {
            paintCubes: player.studioCubes ?? [],
            canvases: []
        }
    }));
    const sellIntents = {};
    payload.players.forEach((player) => {
        sellIntents[player.id] = [];
    });
    const canonicalOrder = payload.turnOrder;
    const firstPlayer = payload.firstPlayerId ?? canonicalOrder[0];
    const turnState = (0, TurnController_1.initializeTurnState)(canonicalOrder, firstPlayer);
    const gameState = {
        id: payload.gameId,
        phase: types_1.GamePhase.LOBBY,
        players,
        turnOrder: canonicalOrder,
        currentPlayerIndex: turnState.currentPlayerIndex,
        turn: turnState,
        day: {
            dayNumber: 1,
            hasNutritionApplied: false
        },
        canvasMarket: {
            slots
        },
        paintMarket: {
            cubes: payload.initialPaintMarket ?? [],
            lastUpdated: timestamp
        },
        paintBag: payload.paintBag,
        canvasDeck: remainingDeck,
        sellIntents,
        firstPlayerId: firstPlayer,
        createdAt: timestamp,
        updatedAt: timestamp
    };
    (0, snapshots_1.storeSnapshot)(gameState);
    return { nextState: gameState };
};
const handleAdvancePhase = (state, action) => {
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    const nextState = (0, TurnController_1.transitionPhase)(state, {
        targetPhase: action.payload?.targetPhase,
        timestamp
    });
    (0, snapshots_1.storeSnapshot)(nextState);
    return { nextState };
};
const handleDrawPaintCubes = (state, action) => {
    const { drawn, remaining } = (0, utils_1.drawFromBag)(state.paintBag, action.payload.count);
    const playerIndex = state.players.findIndex((player) => player.id === action.payload.playerId);
    const player = state.players[playerIndex];
    const updatedPlayer = {
        ...player,
        studio: {
            ...player.studio,
            paintCubes: [...player.studio.paintCubes, ...drawn]
        }
    };
    const nextPlayers = [...state.players];
    nextPlayers[playerIndex] = updatedPlayer;
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    const intermediateState = {
        ...state,
        players: nextPlayers,
        paintBag: remaining
    };
    return finalizePlayerAction(intermediateState, timestamp);
};
const handleBuyCanvas = (state, action) => {
    const slot = state.canvasMarket.slots[action.payload.slotIndex];
    const playerIndex = state.players.findIndex((player) => player.id === action.payload.playerId);
    const player = state.players[playerIndex];
    const payment = player.studio.paintCubes.slice(0, slot.cost);
    const remainingStudioCubes = player.studio.paintCubes.slice(slot.cost);
    const purchasedCanvas = {
        ...slot.canvas,
        ownerId: player.id,
        placedCubes: { ...slot.canvas.placedCubes }
    };
    const updatedPlayer = {
        ...player,
        studio: {
            ...player.studio,
            paintCubes: remainingStudioCubes,
            canvases: [...player.studio.canvases, purchasedCanvas]
        }
    };
    const nextPlayers = [...state.players];
    nextPlayers[playerIndex] = updatedPlayer;
    const remainingSlots = state.canvasMarket.slots.filter((_, index) => index !== action.payload.slotIndex);
    const reorganizedSlots = remainingSlots.map((slotEntry, index) => ({
        ...slotEntry,
        slotIndex: index,
        cost: slotCost(index)
    }));
    const nextCard = state.canvasDeck[0];
    const nextDeck = nextCard ? state.canvasDeck.slice(1) : state.canvasDeck;
    if (nextCard) {
        reorganizedSlots.push({
            slotIndex: reorganizedSlots.length,
            canvas: nextCard,
            cost: slotCost(reorganizedSlots.length)
        });
    }
    const updatedPaintMarket = {
        ...state.paintMarket,
        cubes: [...state.paintMarket.cubes, ...payment],
        lastUpdated: action.meta?.timestamp ?? state.paintMarket.lastUpdated
    };
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    const intermediateState = {
        ...state,
        players: nextPlayers,
        canvasMarket: {
            slots: reorganizedSlots
        },
        canvasDeck: nextDeck,
        paintMarket: updatedPaintMarket
    };
    return finalizePlayerAction(intermediateState, timestamp);
};
const handleApplyPaintToCanvas = (state, action) => {
    const playerIndex = state.players.findIndex((player) => player.id === action.payload.playerId);
    const player = state.players[playerIndex];
    const canvasIndex = player.studio.canvases.findIndex((canvas) => canvas.id === action.payload.canvasId);
    const playerCanvas = player.studio.canvases[canvasIndex];
    const cube = player.studio.paintCubes.find((item) => item.id === action.payload.cubeId);
    const updatedCanvas = {
        ...playerCanvas,
        placedCubes: {
            ...playerCanvas.placedCubes,
            [action.payload.squareId]: cube
        }
    };
    const updatedPlayer = {
        ...player,
        studio: {
            ...player.studio,
            paintCubes: player.studio.paintCubes.filter((item) => item.id !== cube.id),
            canvases: player.studio.canvases.map((entry, index) => index === canvasIndex ? updatedCanvas : entry)
        }
    };
    const nextPlayers = [...state.players];
    nextPlayers[playerIndex] = updatedPlayer;
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    const intermediateState = {
        ...state,
        players: nextPlayers
    };
    return finalizePlayerAction(intermediateState, timestamp);
};
const handleDeclareSellIntent = (state, action) => {
    const nextSellIntents = {
        ...state.sellIntents,
        [action.payload.playerId]: [...action.payload.canvasIds]
    };
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    const intermediateState = {
        ...state,
        sellIntents: nextSellIntents
    };
    return finalizePlayerAction(intermediateState, timestamp);
};
const handleEndTurn = (state, action) => {
    const timestamp = action.meta?.timestamp ?? state.updatedAt;
    return finalizePlayerAction(state, timestamp);
};
const gameReducer = (state, action) => {
    const validationError = (0, validators_1.validateAction)(state, action);
    if (validationError) {
        return { error: validationError };
    }
    switch (action.type) {
        case 'INITIALIZE_GAME':
            return handleInitializeGame(action);
        case 'ADVANCE_PHASE':
            return handleAdvancePhase(state, action);
        case 'DRAW_PAINT_CUBES':
            return handleDrawPaintCubes(state, action);
        case 'BUY_CANVAS':
            return handleBuyCanvas(state, action);
        case 'APPLY_PAINT_TO_CANVAS':
            return handleApplyPaintToCanvas(state, action);
        case 'DECLARE_SELL_INTENT':
            return handleDeclareSellIntent(state, action);
        case 'END_TURN':
            return handleEndTurn(state, action);
        default:
            return { error: { message: 'Unhandled action type' } };
    }
};
exports.gameReducer = gameReducer;
