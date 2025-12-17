import { initDbPool } from '../../server/src/db/pool';
import * as mysql from 'mysql2/promise';
import { getConfig } from '../../server/src/config/env';

const mockPool = {
  query: jest.fn(),
  getConnection: jest.fn(async () => ({
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn()
  }))
};

jest.mock('mysql2/promise', () => {
  const mysqlMock = {
    createPool: jest.fn(() => mockPool)
  };

  return {
    __esModule: true,
    default: mysqlMock,
    createPool: mysqlMock.createPool
  };
});

const mockedCreatePool = mysql.createPool as jest.MockedFunction<typeof mysql.createPool>;

describe('database connection layer', () => {
  it('builds a pool using the environment configuration', () => {
    const config = getConfig();
    initDbPool();
    expect(mockedCreatePool).toHaveBeenCalledWith(
      expect.objectContaining({
        host: config.database.host,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        port: config.database.port
      })
    );
  });
});
