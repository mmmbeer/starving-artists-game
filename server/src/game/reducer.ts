import { GamePhase, GameState, PlayerId } from '../types';
import {
  ActionResult,
  AdvancePhaseAction,
  ApplyPaintToCanvasAction,
  BuyCanvasAction,
  DeclareSellIntentAction,
  DrawPaintCubesAction,
  EndTurnAction,
  GameAction,
  InitializeGameAction
} from './actions';
import { validateAction } from './validators';
import { createCanvasState, drawFromBag } from './utils';
import { storeSnapshot } from './snapshots';
import { advanceTurnAfterAction, initializeTurnState, transitionPhase } from './TurnController';

const slotCost = (index: number) => index + 1;

const finalizePlayerAction = (state: GameState, timestamp: string): ActionResult => {
  const { nextState, phaseCompleted } = advanceTurnAfterAction(state);
  let finalState = { ...nextState, updatedAt: timestamp };
  if (phaseCompleted) {
    finalState = transitionPhase(finalState, { timestamp });
  }
  storeSnapshot(finalState);
  return { nextState: finalState };
};

const buildMarket = (
  canvasStates: GameState['canvasDeck'],
  timestamp: string,
  size: number
) => {
  const initialSlots: GameState['canvasMarket']['slots'] = [];
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

const handleInitializeGame = (action: InitializeGameAction): ActionResult => {
  const { payload } = action;
  const timestamp = payload.timestamp;
  const canvasStates = payload.canvasDeck.map((definition) =>
    createCanvasState(definition, timestamp)
  );
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

  const sellIntents: Record<PlayerId, string[]> = {};
  payload.players.forEach((player) => {
    sellIntents[player.id] = [];
  });

  const canonicalOrder = payload.turnOrder;
  const firstPlayer = payload.firstPlayerId ?? canonicalOrder[0];
  const turnState = initializeTurnState(canonicalOrder, firstPlayer);

  const gameState: GameState = {
    id: payload.gameId,
    phase: GamePhase.LOBBY,
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

  storeSnapshot(gameState);
  return { nextState: gameState };
};

const handleAdvancePhase = (state: GameState, action: AdvancePhaseAction): ActionResult => {
  const timestamp = action.meta?.timestamp ?? state.updatedAt;
  const nextState = transitionPhase(state, {
    targetPhase: action.payload?.targetPhase,
    timestamp
  });
  storeSnapshot(nextState);
  return { nextState };
};

const handleDrawPaintCubes = (state: GameState, action: DrawPaintCubesAction): ActionResult => {
  const { drawn, remaining } = drawFromBag(state.paintBag, action.payload.count);
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
  const intermediateState: GameState = {
    ...state,
    players: nextPlayers,
    paintBag: remaining
  };

  return finalizePlayerAction(intermediateState, timestamp);
};

const handleBuyCanvas = (state: GameState, action: BuyCanvasAction): ActionResult => {
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
  const intermediateState: GameState = {
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

const handleApplyPaintToCanvas = (state: GameState, action: ApplyPaintToCanvasAction): ActionResult => {
  const playerIndex = state.players.findIndex((player) => player.id === action.payload.playerId);
  const player = state.players[playerIndex];
  const canvasIndex = player.studio.canvases.findIndex((canvas) => canvas.id === action.payload.canvasId);
  const playerCanvas = player.studio.canvases[canvasIndex];
  const cube = player.studio.paintCubes.find((item) => item.id === action.payload.cubeId)!;

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
      canvases: player.studio.canvases.map((entry, index) =>
        index === canvasIndex ? updatedCanvas : entry
      )
    }
  };

  const nextPlayers = [...state.players];
  nextPlayers[playerIndex] = updatedPlayer;

  const timestamp = action.meta?.timestamp ?? state.updatedAt;
  const intermediateState: GameState = {
    ...state,
    players: nextPlayers
  };

  return finalizePlayerAction(intermediateState, timestamp);
};

const handleDeclareSellIntent = (state: GameState, action: DeclareSellIntentAction): ActionResult => {
  const nextSellIntents = {
    ...state.sellIntents,
    [action.payload.playerId]: [...action.payload.canvasIds]
  };

  const timestamp = action.meta?.timestamp ?? state.updatedAt;
  const intermediateState: GameState = {
    ...state,
    sellIntents: nextSellIntents
  };

  return finalizePlayerAction(intermediateState, timestamp);
};

const handleEndTurn = (state: GameState, action: EndTurnAction): ActionResult => {
  const timestamp = action.meta?.timestamp ?? state.updatedAt;
  return finalizePlayerAction(state, timestamp);
};

export const gameReducer = (state: GameState | undefined, action: GameAction): ActionResult => {
  const validationError = validateAction(state, action);
  if (validationError) {
    return { error: validationError };
  }

  switch (action.type) {
    case 'INITIALIZE_GAME':
      return handleInitializeGame(action);
    case 'ADVANCE_PHASE':
      return handleAdvancePhase(state!, action);
    case 'DRAW_PAINT_CUBES':
      return handleDrawPaintCubes(state!, action);
    case 'BUY_CANVAS':
      return handleBuyCanvas(state!, action);
    case 'APPLY_PAINT_TO_CANVAS':
      return handleApplyPaintToCanvas(state!, action);
    case 'DECLARE_SELL_INTENT':
      return handleDeclareSellIntent(state!, action);
    case 'END_TURN':
      return handleEndTurn(state!, action);
    default:
      return { error: { message: 'Unhandled action type' } };
  }
};
