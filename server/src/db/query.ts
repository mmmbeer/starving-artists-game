import { Pool } from 'mysql2/promise';
import { getDbPool } from './pool';

export type QueryParams = readonly unknown[];

export const dbQuery = async <T = unknown>(sql: string, params: QueryParams = []): Promise<T[]> => {
  const pool: Pool = getDbPool();
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
};
