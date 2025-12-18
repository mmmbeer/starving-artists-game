import { Pool, RowDataPacket } from 'mysql2/promise';
import { getDbPool } from './pool';

export type QueryParams = readonly unknown[];

export const dbQuery = async <T extends RowDataPacket = RowDataPacket>(sql: string, params: QueryParams = []): Promise<T[]> => {
  const pool: Pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as T[];
};
