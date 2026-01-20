"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wildCubeCount = exports.isCanvasComplete = exports.getSquareDefinition = exports.findPlayerCanvas = exports.findPlayerById = exports.createCanvasState = exports.drawFromBag = void 0;
const drawFromBag = (bag, count) => {
    const drawn = bag.slice(0, count);
    const remaining = bag.slice(count);
    return { drawn, remaining };
};
exports.drawFromBag = drawFromBag;
const createCanvasState = (definition, createdAt, options) => ({
    id: options?.overrideId ?? definition.id,
    definition,
    ownerId: options?.ownerId,
    placedCubes: {},
    createdAt
});
exports.createCanvasState = createCanvasState;
const findPlayerById = (state, playerId) => state.players.find((player) => player.id === playerId);
exports.findPlayerById = findPlayerById;
const findPlayerCanvas = (state, playerId, canvasId) => {
    const player = (0, exports.findPlayerById)(state, playerId);
    return player?.studio.canvases.find((canvas) => canvas.id === canvasId);
};
exports.findPlayerCanvas = findPlayerCanvas;
const getSquareDefinition = (canvas, squareId) => canvas.definition.squares.find((square) => square.id === squareId);
exports.getSquareDefinition = getSquareDefinition;
const isCanvasComplete = (canvas) => canvas.definition.squares.length > 0 && Object.keys(canvas.placedCubes).length >= canvas.definition.squares.length;
exports.isCanvasComplete = isCanvasComplete;
const wildCubeCount = (canvas) => Object.values(canvas.placedCubes).filter((cube) => cube.color === 'wild').length;
exports.wildCubeCount = wildCubeCount;
