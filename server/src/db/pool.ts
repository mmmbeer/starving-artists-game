import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { getConfig } from '../config/env';

let pool: Pool | null = null;

export const initDbPool = (overrides?: Partial<PoolOptions>): Pool => {
  if (pool) {
    return pool;
  }

  const config = getConfig();
  pool = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    port: config.database.port,
    waitForConnections: true,
    connectionLimit: 10,
    ...overrides
  } as PoolOptions);

  return pool;
};

export const getDbPool = (): Pool => {
  if (!pool) {
    return initDbPool();
  }
  return pool;
};
