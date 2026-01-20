"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextPhase = exports.isSellingPhase = exports.isActionPhase = exports.PHASE_SEQUENCE = exports.ACTION_PHASES = void 0;
const types_1 = require("../types");
exports.ACTION_PHASES = [types_1.GamePhase.MORNING, types_1.GamePhase.AFTERNOON];
exports.PHASE_SEQUENCE = [
    types_1.GamePhase.LOBBY,
    types_1.GamePhase.MORNING,
    types_1.GamePhase.AFTERNOON,
    types_1.GamePhase.SELLING,
    types_1.GamePhase.ENDED
];
const isActionPhase = (phase) => exports.ACTION_PHASES.includes(phase);
exports.isActionPhase = isActionPhase;
const isSellingPhase = (phase) => phase === types_1.GamePhase.SELLING;
exports.isSellingPhase = isSellingPhase;
const getNextPhase = (current) => {
    if (current === types_1.GamePhase.SELLING) {
        return types_1.GamePhase.MORNING;
    }
    const currentIndex = exports.PHASE_SEQUENCE.indexOf(current);
    if (currentIndex === -1 || currentIndex === exports.PHASE_SEQUENCE.length - 1) {
        return types_1.GamePhase.ENDED;
    }
    return exports.PHASE_SEQUENCE[currentIndex + 1];
};
exports.getNextPhase = getNextPhase;
