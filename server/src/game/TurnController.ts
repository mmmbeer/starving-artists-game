import { GamePhase, GameState, PlayerId } from '../types';
import { ACTION_PHASES, getNextPhase, isSellingPhase } from './turnTypes';

const rotateOrderToFirstPlayer = (order: PlayerId[], firstPlayerId: PlayerId): PlayerId[] => {
  if (order.length === 0) {
    return order;
  }
  const index = order.indexOf(firstPlayerId);
  if (index <= 0) {
    return [...order];
  }
  return [...order.slice(index), ...order.slice(0, index)];
};

const buildDynamicTurnOrder = (canonicalOrder: PlayerId[], firstPlayerId: PlayerId | undefined): PlayerId[] => {
  if (!firstPlayerId || canonicalOrder.length === 0) {
    return [...canonicalOrder];
  }
  return rotateOrderToFirstPlayer(canonicalOrder, firstPlayerId);
};

const rotateFirstPlayerForward = (canonicalOrder: PlayerId[], currentFirst: PlayerId | undefined): PlayerId | undefined => {
  if (canonicalOrder.length === 0) {
    return undefined;
  }
  const currentIndex = canonicalOrder.indexOf(currentFirst ?? canonicalOrder[0]);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % canonicalOrder.length;
  return canonicalOrder[nextIndex];
};

const applyDailyNutrition = (state: GameState): GameState => {
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

export const getCurrentPlayerId = (state: GameState): PlayerId | undefined => {
  if (state.turn.order.length === 0) {
    return undefined;
  }
  return state.turn.order[state.turn.currentPlayerIndex];
};

export const isPlayersTurn = (state: GameState, playerId: PlayerId): boolean => {
  const current = getCurrentPlayerId(state);
  return current === playerId;
};

export const advanceTurnAfterAction = (state: GameState): { nextState: GameState; phaseCompleted: boolean } => {
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

  const shouldTrackPhase =
    ACTION_PHASES.includes(state.phase) || isSellingPhase(state.phase);
  const phaseCompleted = shouldTrackPhase && nextTurnState.actionsTakenThisPhase >= state.turn.order.length;

  return { nextState, phaseCompleted };
};

export const transitionPhase = (state: GameState, options?: { targetPhase?: GamePhase; timestamp?: string }): GameState => {
  const nextPhase = options?.targetPhase ?? getNextPhase(state.phase);
  const timestamp = options?.timestamp ?? state.updatedAt;

  const enteringNewDay = state.phase === GamePhase.SELLING && nextPhase === GamePhase.MORNING;

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

  let nextState: GameState = {
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

  if (nextPhase === GamePhase.MORNING) {
    nextState = applyDailyNutrition(nextState);
  }

  return nextState;
};

export const initializeTurnState = (canonicalOrder: PlayerId[], firstPlayerId?: PlayerId) => ({
  order: buildDynamicTurnOrder(canonicalOrder, firstPlayerId),
  currentPlayerIndex: 0,
  actionsTakenThisPhase: 0
});
