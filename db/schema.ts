import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    version: integer("version").notNull().default(0),
    stateJson: text("state_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [index("games_expires_at_idx").on(table.expiresAt)],
);

export const playerSecrets = sqliteTable(
  "player_secrets",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.playerId] })],
);

export const processedActions = sqliteTable(
  "processed_actions",
  {
    gameId: text("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    actionId: text("action_id").notNull(),
    playerId: text("player_id").notNull(),
    resultingVersion: integer("resulting_version").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.gameId, table.actionId] })],
);

export const canvasOverrides = sqliteTable("canvas_overrides", {
  canvasId: text("canvas_id").primaryKey(),
  definitionJson: text("definition_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});
