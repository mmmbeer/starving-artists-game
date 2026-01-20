"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTurnState = exports.transitionPhase = exports.advanceTurnAfterAction = exports.isPlayersTurn = exports.getCurrentPlayerId = void 0;
const types_1 = require("../types");
const turnTypes_1 = require("./turnTypes");
const rotateOrderToFirstPlayer = (order, firstPlayerId) => {
    if (order.length === 0) {
        return order;
    }
    const index = order.indexOf(firstPlayerId);
    if (index <= 0) {
        return [...order];
    }
    return [...order.slice(index), ...order.slice(0, index)];
};
const buildDynamicTurnOrder = (canonicalOrder, firstPlayerId) => {
    if (!firstPlayerId || canonicalOrder.length === 0) {
        return [...canonicalOrder];
    }
    return rotateOrderToFirstPlayer(canonicalOrder, firstPlayerId);
};
const rotateFirstPlayerForward = (canonicalOrder, currentFirst) => {
    if (canonicalOrder.length === 0) {
        return undefined;
    }
    const currentIndex = canonicalOrder.indexOf(currentFirst ?? canonicalOrder[0]);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % canonicalOrder.length;
    return canonicalOrder[nextIndex];
};
const applyDailyNutrition = (state) => {
    if (state.day.hasNutritionApplied || state.day.dayNumber === 1) {
        return {
            ...state,
            day: {
                ...state.day,
                hasNutritionApplied: true
            }
        };
    }
    const updatedPlayers = state.players.map((player) => ({
        ...player,
        nutrition: Math.max(0, player.nutrition - 1)
    }));
    return {
        ...state,
        players: updatedPlayers,
        day: {
            ...state.day,
            hasNutritionApplied: true
        }
    };
};
const getCurrentPlayerId = (state) => {
    if (state.turn.order.length === 0) {
        return undefined;
    }
    return state.turn.order[state.turn.currentPlayerIndex];
};
exports.getCurrentPlayerId = getCurrentPlayerId;
const isPlayersTurn = (state, playerId) => {
    const current = (0, exports.getCurrentPlayerId)(state);
    return current === playerId;
};
exports.isPlayersTurn = isPlayersTurn;
const advanceTurnAfterAction = (state) => {
    if (state.turn.order.length === 0) {
        return { nextState: state, phaseCompleted: false };
    }
    const nextTurnState = {
        ...state.turn,
        currentPlayerIndex: (state.turn.currentPlayerIndex + 1) % state.turn.order.length,
        actionsTakenThisPhase: state.turn.actionsTakenThisPhase + 1
    };
    const nextState = {
        ...state,
        turn: nextTurnState,
        currentPlayerIndex: nextTurnState.currentPlayerIndex
    };
    const shouldTrackPhase = turnTypes_1.ACTION_PHASES.includes(state.phase) || (0, turnTypes_1.isSellingPhase)(state.phase);
    const phaseCompleted = shouldTrackPhase && nextTurnState.actionsTakenThisPhase >= state.turn.order.length;
    return { nextState, phaseCompleted };
};
exports.advanceTurnAfterAction = advanceTurnAfterAction;
const transitionPhase = (state, options) => {
    const nextPhase = options?.targetPhase ?? (0, turnTypes_1.getNextPhase)(state.phase);
    const timestamp = options?.timestamp ?? state.updatedAt;
    const enteringNewDay = state.phase === types_1.GamePhase.SELLING && nextPhase === types_1.GamePhase.MORNING;
    const canonicalOrder = state.turnOrder;
    const nextFirstPlayerId = enteringNewDay
        ? rotateFirstPlayerForward(canonicalOrder, state.firstPlayerId)
        : state.firstPlayerId;
    const nextDynamicOrder = enteringNewDay
        ? buildDynamicTurnOrder(canonicalOrder, nextFirstPlayerId)
        : state.turn.order;
    const nextDay = enteringNewDay
        ? {
            dayNumber: state.day.dayNumber + 1,
            hasNutritionApplied: false
        }
        : state.day;
    let nextState = {
        ...state,
        phase: nextPhase,
        day: nextDay,
        firstPlayerId: nextFirstPlayerId ?? state.firstPlayerId,
        turn: {
            ...state.turn,
            order: nextDynamicOrder,
            currentPlayerIndex: 0,
            actionsTakenThisPhase: 0
        },
        currentPlayerIndex: 0,
        updatedAt: timestamp
    };
    if (nextPhase === types_1.GamePhase.MORNING) {
        nextState = applyDailyNutrition(nextState);
    }
    return nextState;
};
exports.transitionPhase = transitionPhase;
const initializeTurnState = (canonicalOrder, firstPlayerId) => ({
    order: buildDynamicTurnOrder(canonicalOrder, firstPlayerId),
    currentPlayerIndex: 0,
    actionsTakenThisPhase: 0
});
exports.initializeTurnState = initializeTurnState;
