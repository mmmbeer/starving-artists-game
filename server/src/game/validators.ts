import { GamePhase, GameState } from '../types';
import {
  ApplyPaintToCanvasAction,
  AdvancePhaseAction,
  BuyCanvasAction,
  DeclareSellIntentAction,
  DrawPaintCubesAction,
  GameAction,
  GameError,
  InitializeGameAction
} from './actions';
import { findPlayerById, findPlayerCanvas, getSquareDefinition, isCanvasComplete, wildCubeCount } from './utils';

const PHASE_SEQUENCE = [
  GamePhase.LOBBY,
  GamePhase.MORNING,
  GamePhase.AFTERNOON,
  GamePhase.SELLING,
  GamePhase.ENDED
];

const actionAllowedPhases = {
  draw: [GamePhase.MORNING, GamePhase.AFTERNOON],
  buy: [GamePhase.MORNING, GamePhase.AFTERNOON],
  paint: [GamePhase.MORNING, GamePhase.AFTERNOON],
  sellIntent: [GamePhase.SELLING]
};

export const validateInitializeGame = (action: InitializeGameAction): GameError | undefined => {
  const { players, turnOrder, paintBag, canvasDeck } = action.payload;

  if (players.length === 0) {
    return { message: 'At least one player is required to initialize the game' };
  }

  const uniquePlayers = new Set(players.map((player) => player.id));
  if (uniquePlayers.size !== players.length) {
    return { message: 'Player IDs must be unique during initialization' };
  }

  if (turnOrder.length === 0) {
    return { message: 'Turn order must include at least one player' };
  }

  for (const playerId of turnOrder) {
    if (!uniquePlayers.has(playerId)) {
      return { message: 'Turn order includes unknown player IDs' };
    }
  }

  if (paintBag.length === 0) {
    return { message: 'Paint bag must contain at least one cube' };
  }

  const desiredMarketSize = Math.max(0, action.payload.initialMarketSize ?? 3);
  if (desiredMarketSize > canvasDeck.length) {
    return { message: 'Canvas deck must contain enough cards for the starting market' };
  }

  if (canvasDeck.length === 0) {
    return { message: 'Canvas deck must contain cards' };
  }

  return undefined;
};

export const validateAdvancePhase = (state: GameState | undefined, action: AdvancePhaseAction): GameError | undefined => {
  if (!state) {
    return { message: 'Game has not been initialized' };
  }

  if (state.phase === GamePhase.ENDED) {
    return { message: 'Game has already ended' };
  }

  const currentIndex = PHASE_SEQUENCE.indexOf(state.phase);
  const targetPhase = action.payload?.targetPhase;
  const nextIndex = targetPhase ? PHASE_SEQUENCE.indexOf(targetPhase) : currentIndex + 1;

  if (targetPhase && nextIndex <= currentIndex) {
    return { message: 'Cannot transition to an earlier or identical phase' };
  }

  if (nextIndex <= currentIndex || nextIndex === -1 || nextIndex >= PHASE_SEQUENCE.length) {
    return { message: 'Invalid phase transition requested' };
  }

  return undefined;
};

export const validateDrawPaintCubes = (state: GameState | undefined, action: DrawPaintCubesAction): GameError | undefined => {
  if (!state) {
    return { message: 'Game has not been initialized' };
  }

  if (!action.payload.count || action.payload.count < 1) {
    return { message: 'Must draw at least one cube' };
  }

  if (!actionAllowedPhases.draw.includes(state.phase)) {
    return { message: 'Cannot draw cubes outside of action phases' };
  }

  if (state.paintBag.length < action.payload.count) {
    return { message: 'Not enough cubes left in the bag' };
  }

  if (!state.players.some((player) => player.id === action.payload.playerId)) {
    return { message: 'Unknown player attempted to draw cubes' };
  }

  return undefined;
};

export const validateBuyCanvas = (state: GameState | undefined, action: BuyCanvasAction): GameError | undefined => {
  if (!state) {
    return { message: 'Game has not been initialized' };
  }

  if (!actionAllowedPhases.buy.includes(state.phase)) {
    return { message: 'Cannot buy canvases outside of action phases' };
  }

  const slot = state.canvasMarket.slots[action.payload.slotIndex];
  if (!slot) {
    return { message: 'Requested canvas slot is not available' };
  }

  const player = state.players.find((p) => p.id === action.payload.playerId);
  if (!player) {
    return { message: 'Unknown player attempted to buy a canvas' };
  }

  if (player.studio.paintCubes.length < slot.cost) {
    return { message: 'Player does not have enough cubes to purchase canvas' };
  }

  return undefined;
};

export const validateApplyPaintCube = (
  state: GameState | undefined,
  action: ApplyPaintToCanvasAction
): GameError | undefined => {
  if (!state) {
    return { message: 'Game has not been initialized' };
  }

  if (!actionAllowedPhases.paint.includes(state.phase)) {
    return { message: 'Cannot apply paint outside of action phases' };
  }

  const player = findPlayerById(state, action.payload.playerId);
  if (!player) {
    return { message: 'Unknown player attempted to place paint' };
  }

  const canvas = findPlayerCanvas(state, player.id, action.payload.canvasId);
  if (!canvas) {
    return { message: 'Canvas not found in player studio' };
  }

  const hasCube = player.studio.paintCubes.some((cube) => cube.id === action.payload.cubeId);
  if (!hasCube) {
    return { message: 'Cube not available in player studio' };
  }

  const squareDefinition = getSquareDefinition(canvas, action.payload.squareId);
  if (!squareDefinition) {
    return { message: 'Canvas square not found' };
  }

  if (canvas.placedCubes[action.payload.squareId]) {
    return { message: 'Square already has a cube' };
  }

  const cube = player.studio.paintCubes.find((item) => item.id === action.payload.cubeId);
  if (!cube) {
    return { message: 'Cube metadata missing when placing' };
  }

  const isWild = cube.color === 'wild';
  if (!isWild && !squareDefinition.allowedColors.includes(cube.color)) {
    return { message: 'Cube color does not match square requirements' };
  }

  if (isWild && wildCubeCount(canvas) >= 1) {
    return { message: 'Only one wild cube may be used per canvas' };
  }

  return undefined;
};

export const validateDeclareSellIntent = (
  state: GameState | undefined,
  action: DeclareSellIntentAction
): GameError | undefined => {
  if (!state) {
    return { message: 'Game has not been initialized' };
  }

  if (!actionAllowedPhases.sellIntent.includes(state.phase)) {
    return { message: 'Sell intent may only be declared during the selling phase' };
  }

  const player = findPlayerById(state, action.payload.playerId);
  if (!player) {
    return { message: 'Unknown player attempted to declare sell intent' };
  }

  for (const canvasId of action.payload.canvasIds) {
    const canvas = findPlayerCanvas(state, player.id, canvasId);
    if (!canvas) {
      return { message: `Canvas ${canvasId} not owned by player` };
    }

    if (!isCanvasComplete(canvas)) {
      return { message: `Canvas ${canvasId} is not yet complete` };
    }
  }

  return undefined;
};

export const validateAction = (state: GameState | undefined, action: GameAction): GameError | undefined => {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      return validateInitializeGame(action);
    case 'ADVANCE_PHASE':
      return validateAdvancePhase(state, action);
    case 'DRAW_PAINT_CUBES':
      return validateDrawPaintCubes(state, action);
    case 'BUY_CANVAS':
      return validateBuyCanvas(state, action);
    case 'APPLY_PAINT_TO_CANVAS':
      return validateApplyPaintCube(state, action);
    case 'DECLARE_SELL_INTENT':
      return validateDeclareSellIntent(state, action);
    default:
      return { message: 'Unknown action type' };
  }
};
