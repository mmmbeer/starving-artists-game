
export interface GameRow {
  id: string;
  code: string;
  version: number;
  state_json: string;
  expires_at: string;
}

export interface AuthenticatedGameRow extends GameRow {
  token_hash: string | null;
  processed_version: number | null;
}

let schemaReady: Promise<void> | null = null;

export function database(): D1Database {
  if (!env.DB) throw new Error("The game database is unavailable.");
  return env.DB;
}

export function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  const db = database();
  schemaReady = db
    .batch([
      db
        .prepare(
          `CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL UNIQUE,
            version INTEGER NOT NULL DEFAULT 0,
            state_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            expires_at TEXT NOT NULL
          )`,
        ),
      db
        .prepare(
          `CREATE TABLE IF NOT EXISTS player_secrets (
            game_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (game_id, player_id),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
          )`,
        ),
      db
        .prepare(
          `CREATE TABLE IF NOT EXISTS processed_actions (
            game_id TEXT NOT NULL,
            action_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            resulting_version INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (game_id, action_id),
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
          )`,
        ),
      db.prepare(
        "CREATE INDEX IF NOT EXISTS games_expires_at_idx ON games (expires_at)",
      ),
      db.prepare(
        `CREATE TRIGGER IF NOT EXISTS games_delete_player_secrets
         AFTER DELETE ON games
         BEGIN
           DELETE FROM player_secrets WHERE game_id = OLD.id;
         END`,
      ),
      db.prepare(
        `CREATE TRIGGER IF NOT EXISTS games_delete_processed_actions
         AFTER DELETE ON games
         BEGIN
           DELETE FROM processed_actions WHERE game_id = OLD.id;
         END`,
      ),
    ])
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

import { env } from "cloudflare:workers";
