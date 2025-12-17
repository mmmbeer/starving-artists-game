import { PoolConnection } from 'mysql2/promise';
import { getDbPool } from './pool';

export const withTransaction = async <T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> => {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
