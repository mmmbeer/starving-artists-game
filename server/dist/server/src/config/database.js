"use strict";
// Database configuration - uses in-memory store for development
// This allows testing without MySQL dependency
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryDb = void 0;
exports.getPool = getPool;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
exports.closePool = closePool;
const memoryDb_1 = require("../database/memoryDb");
Object.defineProperty(exports, "memoryDb", { enumerable: true, get: function () { return memoryDb_1.memoryDb; } });
// Mock pool for compatibility with existing code
const mockPool = {
    getConnection: async () => ({
        release: () => { },
        query: async () => [[]],
        execute: async () => [{ insertId: '1' }],
    }),
    end: async () => { },
};
let pool = null;
function getPool() {
    if (!pool) {
        pool = mockPool;
        console.log('Using in-memory database for development');
    }
    return pool;
}
async function query(sql, params) {
    // In-memory mode - queries are handled by memoryDb
    console.log('Query:', sql, params);
    return [];
}
async function queryOne(sql, params) {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
}
async function execute(sql, params) {
    console.log('Execute:', sql, params);
    return { insertId: '1', affectedRows: 1 };
}
async function closePool() {
    if (pool) {
        pool = null;
    }
}
