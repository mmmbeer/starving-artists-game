"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbQuery = void 0;
const pool_1 = require("./pool");
const dbQuery = async (sql, params = []) => {
    const pool = (0, pool_1.getDbPool)();
    const [rows] = await pool.query(sql, params);
    return rows;
};
exports.dbQuery = dbQuery;
