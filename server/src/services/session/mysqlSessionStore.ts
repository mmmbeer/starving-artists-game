// MySQL-backed session store for express-session
import session from 'express-session';
import { execute, queryOne } from '../../config/database';

type SessionRow = {
  session_id: string;
  expires: number;
  data: string;
};

type StoreOptions = {
  ttlMs: number;
};

function toJson(value: any): string {
  return JSON.stringify(value ?? {});
}

function fromJson(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function ensureSessionsTable(): Promise<void> {
  await execute(
    `CREATE TABLE IF NOT EXISTS sessions (
      session_id VARCHAR(128) PRIMARY KEY,
      expires BIGINT NOT NULL,
      data LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_expires (expires)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
}

export class MySQLSessionStore extends session.Store {
  private readonly ttlMs: number;

  constructor(options: StoreOptions) {
    super();
    this.ttlMs = options.ttlMs;
    void ensureSessionsTable().catch(err => {
      console.error('Failed to ensure sessions table:', err);
    });
  }

  get(sid: string, callback: (err?: any, session?: session.SessionData | null) => void): void {
    void (async () => {
      const row = await queryOne<SessionRow>(
        'SELECT session_id, expires, data FROM sessions WHERE session_id = ? LIMIT 1',
        [sid]
      );
      if (!row) {
        callback(null, null);
        return;
      }
      const expiresAt = Number(row.expires);
      if (expiresAt < Date.now()) {
        await execute('DELETE FROM sessions WHERE session_id = ?', [sid]);
        callback(null, null);
        return;
      }
      const data = fromJson(row.data);
      callback(null, data || null);
    })().catch(err => callback(err));
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    void (async () => {
      const expiresAt = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + this.ttlMs;
      await execute(
        'INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)',
        [sid, expiresAt, toJson(sess)]
      );
      if (callback) callback();
    })().catch(err => {
      if (callback) callback(err);
    });
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    void execute('DELETE FROM sessions WHERE session_id = ?', [sid])
      .then(() => {
        if (callback) callback();
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: any) => void): void {
    this.set(sid, sess, callback);
  }
}
