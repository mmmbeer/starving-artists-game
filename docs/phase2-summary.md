# Phase 2 Summary

## Overview
Phase 2 delivered the multiplayer **lobby lifecycle**, covering session management, lobby APIs, presence synchronization, and a lightweight client UI. The server now owns the canonical `GameState` for every lobby, keeps sessions alive through explicit persistence, and emits deterministic `LOBBY_STATE` / `GAME_STARTED` events so clients can stay in sync without assuming any gameplay rules changes.

## Server Architecture

- **GameSession & GameSessionManager** (`server/src/game`)
  * Tracks players, host, connection status, and the authoritative `GameState`.
  * Respects one player per game/user, caps at four, supports reconnects, and enforces that only the host can start the game.
  * Creates the lobby snapshot exposed to clients and emits `lobby-updated` / `game-started` events for realtime listeners.

- **Lobby REST API** (`server/src/lobby/lobbyRoutes.ts`)
  * `POST /lobby/create`: player ID + display name required; creates session and returns structured lobby payload.
  * `POST /lobby/:gameId/join`: adds/reconnects a player; rejects if lobby full or already started.
  * `POST /lobby/:gameId/leave`: marks a player disconnected without deleting the session.
  * `GET /lobby/:gameId`: returns current lobby snapshot.
  * `POST /lobby/:gameId/start`: host-only, validates payload (paint bag + canvas deck) and transitions the phase to `MORNING` via the Phase 1 reducer.
  * Every endpoint returns typed errors (`404`, `403`, `400`) for missing games, unauthorized starts, or invalid payloads.

- **Persistence Hooks** (`server/src/db/sessionPersistence.ts`, `sql/init-schema.sql`)
  * `game_sessions` table stores `game_id`, `host_id`, `phase`, and `expires_at`.
  * `game_session_players` tracks each player's display name, order, and connected flag.
  * `persistGameMetadata` refreshes `expires_at = NOW() + 48h` so the lobby survives at least two days between activity windows.

- **Realtime Sync** (`server/src/realtime/lobbyRealtime.ts`)
  * WebSocket server on `/realtime/lobby`.
  * Clients connect with `gameId` + `playerId` query params; receives the current snapshot on connect.
  * Broadcasts `LOBBY_STATE` on every join/leave/reconnect/start and publishes `GAME_STARTED` when the host begins the game.

## Client State & UI

- **`useLobbyState` hook** (`client/src/state/lobbyState.ts`)
  * Manages lobby snapshot, connection status, player identity, and an optional `GameState`.
  * Handles HTTP calls (create/join/leave/start) and keeps a WebSocket open for live updates.
  * Exposes helpers (`setGameId`, `setPlayerId`, `setDisplayName`) that normalize inputs and update local state with the latest server snapshot.

- **Lobby UI** (`client/src/lobby/LobbyView.tsx`, `LobbyView.css`)
  * Displays player list with host indicator and connection badges.
  * Allows creating or joining games, shows shareable link, and lets the host start the game when ready.
  * Reflects WebSocket-derived connection status and surfaces errors.

- **Game Placeholder** (`client/src/game/GameView.tsx`, `GameView.css`)
  * Simple view that presents current phase/day/players and a button to return to the lobby until full gameplay is implemented.

- **App Shell** (`client/src/App.tsx`)
  * Switches between `LobbyView` and `GameView` depending on whether a `GameState` is stored.

## Testing

- Added deterministic unit/integration coverage under `tests/server/lobby/lifecycle.test.ts` and `tests/server/session/gameSessionManager.test.ts`.
  * Covers create/join/reconnect/leave logic, capacity enforcement, and start-authority.
  * Mocks `sessionPersistence` so DB hooks don't require a real database.
  * `npx jest --config tests/jest.config.ts --runInBand` passes on the current environment.

## Next for Phase 3

1. **Turn flow & gameplay actions**: use the existing Phase 1 reducer hooks (e.g., `draw`, `buy`, `paint`) now that lobby and sessions are stable.
2. **Client action controls**: build UI to request actions via REST/WebSocket events, referencing the current authoritative state.
3. **Persistence & snapshotting**: store full game state snapshots and final results for reconnection, auditing, and Phase 3+ rollback.
4. **Multiplayer score & phase tracking**: use the WebSocket events from Phase 2 as the baseline to broadcast turn updates and eventual selling resolution.

Document any Phase 3 assumptions before adding new rules.
