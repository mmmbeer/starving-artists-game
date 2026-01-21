"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaintBag = createPaintBag;
exports.drawPaintCubes = drawPaintCubes;
exports.addToPaintMarket = addToPaintMarket;
exports.removeFromPaintMarket = removeFromPaintMarket;
exports.canTakeCubeFromMarket = canTakeCubeFromMarket;
exports.executePaintTrade = executePaintTrade;
exports.validateTradeRatio = validateTradeRatio;
const helpers_1 = require("../../utils/helpers");
const constants_1 = require("../../utils/constants");
function createPaintBag() {
    const cubes = [];
    // Regular colors: 18 of each (7 colors = 126 cubes)
    const regularColors = constants_1.PAINT_COLORS.filter(c => c !== 'wild');
    for (const color of regularColors) {
        for (let i = 0; i < 18; i++) {
            cubes.push((0, helpers_1.createPaintCube)(color));
        }
    }
    // Wild cubes: 24
    for (let i = 0; i < 24; i++) {
        cubes.push((0, helpers_1.createPaintCube)('wild'));
    }
    return cubes;
}
function drawPaintCubes(bag, count) {
    return (0, helpers_1.drawFromBag)(bag, count);
}
function addToPaintMarket(market, cubes) {
    return [...market, ...cubes];
}
function removeFromPaintMarket(market, cubeIds) {
    return market.filter(cube => !cubeIds.includes(cube.id));
}
function canTakeCubeFromMarket(cube, playerCubes) {
    // Check if player already has a wild cube
    if (cube.is_wild) {
        return !playerCubes.some(c => c.is_wild);
    }
    return true;
}
function executePaintTrade(playerCubes, tradedCubeIds, receivedCubes) {
    const remaining = playerCubes.filter(c => !tradedCubeIds.includes(c.id));
    return [...remaining, ...receivedCubes];
}
function validateTradeRatio(tradedCount, receivedCount) {
    // 2 for 1, 5 for 2, 9 for 3
    if (tradedCount === 2 && receivedCount === 1)
        return true;
    if (tradedCount === 5 && receivedCount === 2)
        return true;
    if (tradedCount === 9 && receivedCount === 3)
        return true;
    return false;
}
