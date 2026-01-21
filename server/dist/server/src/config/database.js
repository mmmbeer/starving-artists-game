"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
exports.closePool = closePool;
// MySQL database connection
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("./env");
let pool = null;
function getPool() {
    if (!pool) {
        pool = promise_1.default.createPool({
            host: env_1.config.database.host,
            user: env_1.config.database.user,
            password: env_1.config.database.password,
            database: env_1.config.database.database,
            port: env_1.config.database.port,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        });
    }
    return pool;
}
async function query(sql, params) {
    const connection = await getPool().getConnection();
    try {
        const [rows] = await connection.query(sql, params);
        return rows;
    }
    finally {
        connection.release();
    }
}
async function queryOne(sql, params) {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
}
async function execute(sql, params) {
    const connection = await getPool().getConnection();
    try {
        const [result] = await connection.execute(sql, params);
        return result;
    }
    finally {
        connection.release();
    }
}
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
