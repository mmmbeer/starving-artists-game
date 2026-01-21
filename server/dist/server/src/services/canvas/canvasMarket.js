"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCanvasDeck = createCanvasDeck;
exports.drawCanvasCards = drawCanvasCards;
exports.createInitialMarket = createInitialMarket;
exports.refillMarketSlot = refillMarketSlot;
exports.getCanvasCost = getCanvasCost;
exports.shiftMarketLeft = shiftMarketLeft;
exports.resetMarket = resetMarket;
const helpers_1 = require("../utils/helpers");
const canvasDb = __importStar(require("../database/canvasDb"));
async function createCanvasDeck() {
    const allCanvases = await canvasDb.getAllCanvasDefinitions();
    const canvasIds = allCanvases.map(c => c.id);
    return (0, helpers_1.shuffleArray)(canvasIds);
}
function drawCanvasCards(deck, count) {
    const drawn = deck.slice(0, count);
    const remaining = deck.slice(count);
    return { drawn, remaining };
}
async function createInitialMarket(deck) {
    const { drawn, remaining } = drawCanvasCards(deck, 3);
    const canvases = await canvasDb.getCanvasDefinitions(drawn);
    // Fill market slots (some might be null if deck is empty)
    const market = [
        canvases[0] || null,
        canvases[1] || null,
        canvases[2] || null,
    ];
    return { market, remaining };
}
async function refillMarketSlot(market, slotIndex, deck) {
    if (deck.length === 0) {
        market[slotIndex] = null;
        return { market, remaining: deck };
    }
    const { drawn, remaining } = drawCanvasCards(deck, 1);
    const canvas = await canvasDb.getCanvasDefinition(drawn[0]);
    market[slotIndex] = canvas;
    return { market, remaining };
}
function getCanvasCost(slotIndex) {
    // Costs are 1, 2, 3 paint cubes by position
    return slotIndex + 1;
}
function shiftMarketLeft(market) {
    // After purchase, shift remaining cards to the left
    const newMarket = [null, null, null];
    let writeIndex = 0;
    for (let i = 0; i < market.length; i++) {
        if (market[i] !== null) {
            newMarket[writeIndex] = market[i];
            writeIndex++;
        }
    }
    return newMarket;
}
async function resetMarket(deck) {
    // Discard current market and draw 3 new cards
    return createInitialMarket(deck);
}
