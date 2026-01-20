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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lobbySessionManager = exports.GameSessionManager = exports.GameSession = void 0;
__exportStar(require("./actions"), exports);
__exportStar(require("./reducer"), exports);
__exportStar(require("./validators"), exports);
__exportStar(require("./snapshots"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./types"), exports);
var GameSession_1 = require("./GameSession");
Object.defineProperty(exports, "GameSession", { enumerable: true, get: function () { return GameSession_1.GameSession; } });
const GameSessionManager_1 = require("./GameSessionManager");
var GameSessionManager_2 = require("./GameSessionManager");
Object.defineProperty(exports, "GameSessionManager", { enumerable: true, get: function () { return GameSessionManager_2.GameSessionManager; } });
exports.lobbySessionManager = new GameSessionManager_1.GameSessionManager();
