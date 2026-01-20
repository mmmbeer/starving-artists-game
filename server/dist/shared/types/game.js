"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAINT_COLOR_PALETTE = exports.GamePhase = void 0;
const common_1 = require("./common");
Object.defineProperty(exports, "PAINT_COLOR_PALETTE", { enumerable: true, get: function () { return common_1.PAINT_COLOR_PALETTE; } });
var GamePhase;
(function (GamePhase) {
    GamePhase["LOBBY"] = "LOBBY";
    GamePhase["MORNING"] = "MORNING";
    GamePhase["AFTERNOON"] = "AFTERNOON";
    GamePhase["SELLING"] = "SELLING";
    GamePhase["ENDED"] = "ENDED";
})(GamePhase || (exports.GamePhase = GamePhase = {}));
