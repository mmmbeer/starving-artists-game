"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAction = exports.validateEndTurn = exports.validateDeclareSellIntent = exports.validateApplyPaintCube = exports.validateBuyCanvas = exports.validateDrawPaintCubes = exports.validateAdvancePhase = exports.validateInitializeGame = void 0;
const types_1 = require("../types");
const utils_1 = require("./utils");
const TurnController_1 = require("./TurnController");
const PHASE_SEQUENCE = [
    types_1.GamePhase.LOBBY,
    types_1.GamePhase.MORNING,
    types_1.GamePhase.AFTERNOON,
    types_1.GamePhase.SELLING,
    types_1.GamePhase.ENDED
];
const actionAllowedPhases = {
    draw: [types_1.GamePhase.MORNING, types_1.GamePhase.AFTERNOON],
    buy: [types_1.GamePhase.MORNING, types_1.GamePhase.AFTERNOON],
    paint: [types_1.GamePhase.MORNING, types_1.GamePhase.AFTERNOON],
    sellIntent: [types_1.GamePhase.SELLING],
    endTurn: [types_1.GamePhase.MORNING, types_1.GamePhase.AFTERNOON, types_1.GamePhase.SELLING]
};
const ensurePlayerOnTurn = (state, playerId) => {
    const currentPlayerId = (0, TurnController_1.getCurrentPlayerId)(state);
    if (!currentPlayerId) {
        return { message: 'Current player not determined yet' };
    }
    if (!(0, TurnController_1.isPlayersTurn)(state, playerId)) {
        return { message: `Player ${playerId} may not act now` };
    }
    return undefined;
};
const validateInitializeGame = (action) => {
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
exports.validateInitializeGame = validateInitializeGame;
const validateAdvancePhase = (state, action) => {
    if (!state) {
        return { message: 'Game has not been initialized' };
    }
    if (state.phase === types_1.GamePhase.ENDED) {
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
exports.validateAdvancePhase = validateAdvancePhase;
const validateDrawPaintCubes = (state, action) => {
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
    return ensurePlayerOnTurn(state, action.payload.playerId);
};
exports.validateDrawPaintCubes = validateDrawPaintCubes;
const validateBuyCanvas = (state, action) => {
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
    return ensurePlayerOnTurn(state, player.id);
};
exports.validateBuyCanvas = validateBuyCanvas;
const validateApplyPaintCube = (state, action) => {
    if (!state) {
        return { message: 'Game has not been initialized' };
    }
    if (!actionAllowedPhases.paint.includes(state.phase)) {
        return { message: 'Cannot apply paint outside of action phases' };
    }
    const player = (0, utils_1.findPlayerById)(state, action.payload.playerId);
    if (!player) {
        return { message: 'Unknown player attempted to place paint' };
    }
    const canvas = (0, utils_1.findPlayerCanvas)(state, player.id, action.payload.canvasId);
    if (!canvas) {
        return { message: 'Canvas not found in player studio' };
    }
    const hasCube = player.studio.paintCubes.some((cube) => cube.id === action.payload.cubeId);
    if (!hasCube) {
        return { message: 'Cube not available in player studio' };
    }
    const squareDefinition = (0, utils_1.getSquareDefinition)(canvas, action.payload.squareId);
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
    if (isWild && (0, utils_1.wildCubeCount)(canvas) >= 1) {
        return { message: 'Only one wild cube may be used per canvas' };
    }
    return ensurePlayerOnTurn(state, player.id);
};
exports.validateApplyPaintCube = validateApplyPaintCube;
const validateDeclareSellIntent = (state, action) => {
    if (!state) {
        return { message: 'Game has not been initialized' };
    }
    if (!actionAllowedPhases.sellIntent.includes(state.phase)) {
        return { message: 'Sell intent may only be declared during the selling phase' };
    }
    const player = (0, utils_1.findPlayerById)(state, action.payload.playerId);
    if (!player) {
        return { message: 'Unknown player attempted to declare sell intent' };
    }
    for (const canvasId of action.payload.canvasIds) {
        const canvas = (0, utils_1.findPlayerCanvas)(state, player.id, canvasId);
        if (!canvas) {
            return { message: `Canvas ${canvasId} not owned by player` };
        }
        if (!(0, utils_1.isCanvasComplete)(canvas)) {
            return { message: `Canvas ${canvasId} is not yet complete` };
        }
    }
    return ensurePlayerOnTurn(state, player.id);
};
exports.validateDeclareSellIntent = validateDeclareSellIntent;
const validateEndTurn = (state, action) => {
    if (!state) {
        return { message: 'Game has not been initialized' };
    }
    if (!actionAllowedPhases.endTurn.includes(state.phase)) {
        return { message: 'Cannot end turn during this phase' };
    }
    if (!state.players.some((player) => player.id === action.payload.playerId)) {
        return { message: 'Unknown player attempted to end their turn' };
    }
    return ensurePlayerOnTurn(state, action.payload.playerId);
};
exports.validateEndTurn = validateEndTurn;
const validateAction = (state, action) => {
    switch (action.type) {
        case 'INITIALIZE_GAME':
            return (0, exports.validateInitializeGame)(action);
        case 'ADVANCE_PHASE':
            return (0, exports.validateAdvancePhase)(state, action);
        case 'DRAW_PAINT_CUBES':
            return (0, exports.validateDrawPaintCubes)(state, action);
        case 'BUY_CANVAS':
            return (0, exports.validateBuyCanvas)(state, action);
        case 'APPLY_PAINT_TO_CANVAS':
            return (0, exports.validateApplyPaintCube)(state, action);
        case 'DECLARE_SELL_INTENT':
            return (0, exports.validateDeclareSellIntent)(state, action);
        case 'END_TURN':
            return (0, exports.validateEndTurn)(state, action);
        default:
            return { message: 'Unknown action type' };
    }
};
exports.validateAction = validateAction;
