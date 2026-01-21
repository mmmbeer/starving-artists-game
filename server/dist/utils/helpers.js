"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.shuffleArray = shuffleArray;
exports.createPaintCube = createPaintCube;
exports.createInitialPaintBag = createInitialPaintBag;
exports.drawFromBag = drawFromBag;
exports.calculateTurnOrder = calculateTurnOrder;
exports.getNextPlayer = getNextPlayer;
exports.formatDate = formatDate;
exports.sleep = sleep;
// Helper functions
const uuid_1 = require("uuid");
const constants_1 = require("./constants");
function generateId() {
    return (0, uuid_1.v4)();
}
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function createPaintCube(color) {
    return {
        id: generateId(),
        color,
        is_wild: color === 'wild',
    };
}
function createInitialPaintBag() {
    const cubes = [];
    // Add regular colors (approximately 18 of each based on game rules)
    const regularColors = constants_1.PAINT_COLORS.filter(c => c !== 'wild');
    for (const color of regularColors) {
        for (let i = 0; i < 18; i++) {
            cubes.push(createPaintCube(color));
        }
    }
    // Add wild cubes (approximately 24 based on game rules)
    for (let i = 0; i < 24; i++) {
        cubes.push(createPaintCube('wild'));
    }
    return shuffleArray(cubes);
}
function drawFromBag(bag, count) {
    const drawn = bag.slice(0, count);
    const remaining = bag.slice(count);
    return { drawn, remaining };
}
function calculateTurnOrder(playerCount) {
    const order = Array.from({ length: playerCount }, (_, i) => i);
    return shuffleArray(order);
}
function getNextPlayer(currentTurnOrder, totalPlayers) {
    return (currentTurnOrder + 1) % totalPlayers;
}
function formatDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
