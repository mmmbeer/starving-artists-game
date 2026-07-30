import { env } from "cloudflare:workers";
import {
  canvasesForState,
  createCanvasCatalog,
  createLobbyState,
  GameRuleError,
  joinLobby,
  reduceGame,
} from "./engine";
import { getCanvasCatalog } from "./canvas-catalog";
import {
  defaultPlayerAvatar,
  isPlayerAvatar,
} from "./player-identities";
import type {
  GameAction,
  GameEnvelope,
  GameState,
  CanvasDefinition,
  PlayerAvatar,
  PlayerCredential,
} from "./types";

interface GameRow {
  id: string;
  code: string;
  version: number;
  state_json: string;
  expires_at: string;
}

interface AuthenticatedGameRow extends GameRow {
  token_hash: string | null;
  processed_version: number | null;
}

let schemaReady: Promise<void> | null = null;
let lastCleanupAt = 0;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function database(): D1Database {
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

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 32);
  return cleaned || fallback;
}

function normalizeGameName(value: unknown): string {
  if (typeof value !== "string") return "Open Studio";
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 48);
  return cleaned || "Open Studio";
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function seedFromId(value: string): number {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function expiryFromNow(days = 14): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function parseRow(row: GameRow): GameState {
  const game = JSON.parse(row.state_json) as GameState;
  game.version = row.version;
  return game;
}

function envelopeForState(
  state: GameState,
  serverTime: string,
  canvases: CanvasDefinition[],
): GameEnvelope {
  const visibleState = structuredClone(state);
  visibleState.canvasDeck = state.canvasDeck.map((_, index) => `hidden-${index}`);
  visibleState.paintBag = [];
  visibleState.randomState = 0;
  return {
    game: visibleState,
    canvases: canvasesForState(state, createCanvasCatalog(canvases)),
    serverTime,
  };
}

async function cleanupExpiredGames(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  await ensureSchema();
  const expiredAt = new Date(now).toISOString();
  try {
    await database().batch([
      database()
        .prepare(
          `DELETE FROM processed_actions
           WHERE game_id IN (SELECT id FROM games WHERE expires_at <= ?)`,
        )
        .bind(expiredAt),
      database()
        .prepare(
          `DELETE FROM player_secrets
           WHERE game_id IN (SELECT id FROM games WHERE expires_at <= ?)`,
        )
        .bind(expiredAt),
      database()
        .prepare("DELETE FROM games WHERE expires_at <= ?")
        .bind(expiredAt),
    ]);
  } catch (error) {
    lastCleanupAt = 0;
    console.error("Expired game cleanup failed.", error);
  }
}

async function rowByCode(code: string): Promise<GameRow | null> {
  await ensureSchema();
  void cleanupExpiredGames();
  return (
    (await database()
      .prepare(
        `SELECT id, code, version, state_json, expires_at
         FROM games
         WHERE code = ? AND expires_at > ?
         LIMIT 1`,
      )
      .bind(code.toUpperCase(), new Date().toISOString())
      .first<GameRow>()) ?? null
  );
}

async function authenticatedRowByCode(
  code: string,
  playerId: string,
  actionId: string,
): Promise<AuthenticatedGameRow | null> {
  await ensureSchema();
  return (
    (await database()
    .prepare(
      `SELECT
         g.id,
         g.code,
         g.version,
         g.state_json,
         g.expires_at,
         ps.token_hash,
         pa.resulting_version AS processed_version
       FROM games AS g
       LEFT JOIN player_secrets AS ps
         ON ps.game_id = g.id AND ps.player_id = ?
       LEFT JOIN processed_actions AS pa
         ON pa.game_id = g.id AND pa.action_id = ?
       WHERE g.code = ? AND g.expires_at > ?
       LIMIT 1`,
    )
    .bind(
      playerId,
      actionId,
      code.toUpperCase(),
      new Date().toISOString(),
    )
    .first<AuthenticatedGameRow>()) ?? null
  );
}

export async function createGame(input: {
  hostName?: unknown;
  gameName?: unknown;
  avatar?: unknown;
}): Promise<{ envelope: GameEnvelope; credential: PlayerCredential }> {
  await ensureSchema();
  await cleanupExpiredGames();
  const db = database();
  const id = crypto.randomUUID();
  const playerId = crypto.randomUUID();
  const token = makeToken();
  const at = new Date().toISOString();
  const hostName = normalizeName(input.hostName, "Host");
  const gameName = normalizeGameName(input.gameName);
  const avatar = isPlayerAvatar(input.avatar)
    ? input.avatar
    : defaultPlayerAvatar();
  const canvases = await getCanvasCatalog();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const state = createLobbyState({
      id,
      code,
      name: gameName,
      hostPlayerId: playerId,
      hostName,
      hostAvatar: avatar,
      seed: seedFromId(id),
      at,
    });
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO games
              (id, code, version, state_json, created_at, updated_at, expires_at)
             VALUES (?, ?, 0, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            code,
            JSON.stringify(state),
            at,
            at,
            expiryFromNow(),
          ),
        db
          .prepare(
            `INSERT INTO player_secrets
              (game_id, player_id, token_hash, created_at)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(id, playerId, await hashToken(token), at),
      ]);
      return {
        envelope: envelopeForState(state, at, canvases),
        credential: { gameCode: code, playerId, token },
      };
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("Unable to allocate a game code.");
}

export async function getGame(
  code: string,
  knownVersion?: number,
): Promise<GameEnvelope | null | "unchanged"> {
  const row = await rowByCode(code);
  if (!row) return null;
  if (knownVersion !== undefined && row.version === knownVersion) {
    return "unchanged";
  }
  const state = parseRow(row);
  return envelopeForState(
    state,
    new Date().toISOString(),
    await getCanvasCatalog(),
  );
}

export async function joinGame(
  code: string,
  displayNameValue: unknown,
  avatarValue?: unknown,
): Promise<{ envelope: GameEnvelope; credential: PlayerCredential }> {
  const displayName = normalizeName(displayNameValue, "Artist");
  const canvases = await getCanvasCatalog();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await rowByCode(code);
    if (!row) throw new GameRuleError("Game not found.", "NOT_FOUND");
    const at = new Date().toISOString();
    const playerId = crypto.randomUUID();
    const token = makeToken();
    const current = parseRow(row);
    const usedColors = current.players
      .map((player) => player.avatar?.color)
      .filter((color): color is PlayerAvatar["color"] => Boolean(color));
    if (avatarValue !== undefined && !isPlayerAvatar(avatarValue)) {
      throw new GameRuleError(
        "Choose a valid food icon.",
        "INVALID_AVATAR",
      );
    }
    const avatar = isPlayerAvatar(avatarValue)
      ? avatarValue
      : defaultPlayerAvatar(usedColors);
    const state = joinLobby(current, playerId, displayName, at, avatar);
    const nextVersion = row.version + 1;
    state.version = nextVersion;
    const stateJson = JSON.stringify(state);
    const tokenHash = await hashToken(token);
    const [updated, secretInserted] = await database().batch([
      database()
        .prepare(
          `UPDATE games
           SET version = ?, state_json = ?, updated_at = ?, expires_at = ?
           WHERE id = ? AND version = ?`,
        )
        .bind(
          nextVersion,
          stateJson,
          at,
          expiryFromNow(),
          row.id,
          row.version,
        ),
      database()
        .prepare(
          `INSERT INTO player_secrets
            (game_id, player_id, token_hash, created_at)
           SELECT ?, ?, ?, ?
           FROM games
           WHERE id = ? AND version = ? AND state_json = ?`,
        )
        .bind(
          row.id,
          playerId,
          tokenHash,
          at,
          row.id,
          nextVersion,
          stateJson,
        ),
    ]);
    if (
      (updated.meta.changes ?? 0) !== 1 ||
      (secretInserted.meta.changes ?? 0) !== 1
    ) {
      continue;
    }
    return {
      envelope: envelopeForState(state, at, canvases),
      credential: { gameCode: state.code, playerId, token },
    };
  }
  throw new GameRuleError(
    "The lobby changed while you joined. Try again.",
    "VERSION_CONFLICT",
  );
}

export async function applyGameAction(input: {
  code: string;
  playerId: string;
  token: string;
  actionId: string;
  expectedVersion: number;
  action: GameAction;
}): Promise<GameEnvelope> {
  if (!input.playerId || !input.token) {
    throw new GameRuleError("Your player session is missing.", "UNAUTHORIZED");
  }
  const tokenHashPromise = hashToken(input.token);
  const [row, tokenHash, canvases] = await Promise.all([
    authenticatedRowByCode(input.code, input.playerId, input.actionId),
    tokenHashPromise,
    getCanvasCatalog(),
  ]);
  if (!row) throw new GameRuleError("Game not found.", "NOT_FOUND");
  if (!row.token_hash || !timingSafeEqual(row.token_hash, tokenHash)) {
    throw new GameRuleError("Your player session is invalid.", "UNAUTHORIZED");
  }
  const canvasCatalog = createCanvasCatalog(canvases);

  if (row.processed_version !== null) {
    return envelopeForState(
      parseRow(row),
      new Date().toISOString(),
      canvases,
    );
  }
  if (row.version !== input.expectedVersion) {
    throw new GameRuleError(
      "The game changed before that action arrived. Review the latest board and try again.",
      "VERSION_CONFLICT",
    );
  }

  const at = new Date().toISOString();
  const state = reduceGame(
    parseRow(row),
    input.playerId,
    input.action,
    at,
    canvasCatalog,
  );
  const nextVersion = row.version + 1;
  state.version = nextVersion;
  const stateJson = JSON.stringify(state);
  const [updated, actionRecorded] = await database().batch([
    database()
      .prepare(
        `UPDATE games
         SET version = ?, state_json = ?, updated_at = ?, expires_at = ?
         WHERE id = ? AND version = ?`,
      )
      .bind(
        nextVersion,
        stateJson,
        at,
        expiryFromNow(),
        row.id,
        row.version,
      ),
    database()
      .prepare(
        `INSERT OR IGNORE INTO processed_actions
          (game_id, action_id, player_id, resulting_version, created_at)
         SELECT ?, ?, ?, ?, ?
         FROM games
         WHERE id = ? AND version = ? AND state_json = ?`,
      )
      .bind(
        row.id,
        input.actionId,
        input.playerId,
        nextVersion,
        at,
        row.id,
        nextVersion,
        stateJson,
      ),
  ]);
  if (
    (updated.meta.changes ?? 0) !== 1 ||
    (actionRecorded.meta.changes ?? 0) !== 1
  ) {
    throw new GameRuleError(
      "Another action reached the table first. Review the latest board and try again.",
      "VERSION_CONFLICT",
    );
  }
  return envelopeForState(state, at, canvases);
}

export function errorResponse(error: unknown): Response {
  if (error instanceof GameRuleError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "VERSION_CONFLICT"
            ? 409
            : 400;
    return Response.json(
      { error: error.message, code: error.code },
      { status },
    );
  }
  console.error(error);
  return Response.json(
    { error: "The studio hit an unexpected problem.", code: "SERVER_ERROR" },
    { status: 500 },
  );
}
