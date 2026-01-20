"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbPool = exports.initDbPool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("../config/env");
let pool = null;
const initDbPool = (overrides) => {
    if (pool) {
        return pool;
    }
    const config = (0, env_1.getConfig)();
    pool = promise_1.default.createPool({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        port: config.database.port,
        waitForConnections: true,
        connectionLimit: 10,
        ...overrides
    });
    return pool;
};
exports.initDbPool = initDbPool;
const getDbPool = () => {
    if (!pool) {
        return (0, exports.initDbPool)();
    }
    return pool;
};
exports.getDbPool = getDbPool;
