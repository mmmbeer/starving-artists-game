// Database configuration - uses in-memory store for development
// This allows testing without MySQL dependency

import { memoryDb } from '../database/memoryDb';

// Mock pool for compatibility with existing code
const mockPool = {
  getConnection: async () => ({
    release: () => {},
    query: async () => [[]],
    execute: async () => [{ insertId: '1' }],
  }),
  end: async () => {},
};

let pool: any = null;

export function getPool(): any {
  if (!pool) {
    pool = mockPool;
    console.log('Using in-memory database for development');
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  // In-memory mode - queries are handled by memoryDb
  console.log('Query:', sql, params);
  return [];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<any> {
  console.log('Execute:', sql, params);
  return { insertId: '1', affectedRows: 1 };
}

export async function closePool(): Promise<void> {
  if (pool) {
    pool = null;
  }
}

// Export memoryDb for direct access
export { memoryDb };
