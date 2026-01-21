"use strict";
// Game constants
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELLING_PAINT_PAYOUT = exports.PAINT_TRADE_RATES = exports.CANVAS_MARKET_COSTS = exports.WIN_CONDITIONS = exports.MAX_PAINT_CUBES_PER_ACTION = exports.PAINT_MARKET_REFILL_SIZE = exports.INITIAL_PAINT_MARKET_SIZE = exports.CANVAS_MARKET_SIZE = exports.CUBES_PER_WORK_ACTION = exports.INITIAL_NUTRITION = exports.GAME_STATUS = exports.GAME_PHASES = exports.PAINT_COLORS = void 0;
exports.PAINT_COLORS = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'black',
    'wild',
];
exports.GAME_PHASES = {
    MORNING: 'morning',
    DAY: 'day',
    NIGHT: 'night',
    SELLING: 'selling',
};
exports.GAME_STATUS = {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    FINISHED: 'finished',
};
exports.INITIAL_NUTRITION = 5;
exports.CUBES_PER_WORK_ACTION = 3;
exports.CANVAS_MARKET_SIZE = 3;
exports.INITIAL_PAINT_MARKET_SIZE = 4;
exports.PAINT_MARKET_REFILL_SIZE = 4;
exports.MAX_PAINT_CUBES_PER_ACTION = 4;
exports.WIN_CONDITIONS = {
    2: { paintings: 7, points: 16 },
    3: { paintings: 6, points: 14 },
    4: { paintings: 5, points: 12 },
};
exports.CANVAS_MARKET_COSTS = [1, 2, 3]; // Cost in paint cubes by position
exports.PAINT_TRADE_RATES = {
    TWO_FOR_ONE: 2,
    FIVE_FOR_TWO: 5,
    NINE_FOR_THREE: 9,
};
exports.SELLING_PAINT_PAYOUT = {
    FIRST: 4,
    SECOND: 2,
    OTHER: 1,
};
