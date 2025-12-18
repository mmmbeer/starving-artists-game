# Phase 0 Summary

## Introduction
This repository bootstraps Phase 0 of **Starving Artists Online**. The goal of this phase was to lay the architectural foundation described by `docs/development-plan.md` while honoring the AGENTS instructions (server authority, deterministic flows, explicit state transitions, zero partial deliverables). The repository now exposes a monorepo with separate backend, frontend, shared types, and verification tooling so a later phase can focus entirely on gameplay rules and UI polish.

## Repository Layout
- `server/` – Express + TypeScript backend with a separate `src/` for development and `dist/` for the compiled production bundle; includes the lobby service, database pool, configuration loader, and static asset serving logic.
- `client/` – Vite + React SPA; `src/` hosts the development entry points and `client/dist/` is the built artifact the server serves under `/`.
- `shared/types/` – Canonical domain models (Game, Player, Canvas, Paint) shared across backend, frontend, and tests to keep all agencies aligned.
- `tests/` – Jest suites validating the server health endpoint, deterministic shared types, and the database connection layer.
- `docs/` – Planning docs and now this summary, documenting intent for Phase 1.
- `sql/init-schema.sql` – Base MySQL schema referenced by the README for setting up the authoritative database layer.

## Phase 0 Deliverables
1. Monorepo tooling (`package.json` workspaces) that routes `npm run server:*` and `npm run client:*` scripts to their respective workspaces.
2. Shared TypeScript artifacts under `shared/types` (GamePhase enum, GameState, PlayerState, PaintColor palette, Canvas metadata) so every agent shares the same canonical concepts.
3. Minimal Express backend exposing `GET /health`, `/lobby` routes (create, join, query), and static serving of the built SPA from `client/dist`.
4. Database infrastructure with `dotenv`-driven configuration, a pooled `mysql2` connection (`initDbPool`/`getDbPool`), and graceful shutdown handling.
5. Jest-based verification of deterministic behavior: health checks, mocked DB pool expectations, and shared-type constants.
6. Documentation & planning artifacts that capture how Phase 0 was assembled and what is required for Phase 1.

## Shared Domain Model
- **Game & Player** – `GameState` stores canonical fields (ID, phase, players, optional first player marker, timestamps). `PlayerState` includes display names, order, nutrition, score, and connectivity status for deterministic turn resolution.
- **GamePhase** – Fully enumerated lifecycle (`LOBBY`, `MORNING`, `AFTERNOON`, `SELLING`, `ENDED`) to support reducer-style transitions later.
- **PaintColor** – Fixed palette [`red`, `orange`, `yellow`, `green`, `blue`, `purple`, `black`, `wild`] with the special `wild` semantics to be enforced in future phases.
- **Canvas & Paint Types** – Placeholder metadata for canvas squares, dimensions, and paint assets exists so future feature builds can extend them without renaming.

## Server Foundation
- Entry point: `server/src/index.ts` (compiled to `server/dist/server/src/index.js`), which loads `createApp`, initializes the DB pool, and wires up graceful SIGINT/SIGTERM shutdown.
- `createApp` (`server/src/app.ts`) configures JSON parsing, a `/health` route, the `/lobby` router, static serving from `client/dist`, and a catch-all delivering `index.html`. It locates `client/dist` relative to either the source tree or the production bundle for compatibility with both local dev and cPanel hosting.
- Lobby logic (`server/src/lobby`) manages an in-memory map of `GameState` snapshots. `createGame` seeds a lobby, `joinGame` enforces no duplicate players and assigns the first-player marker, and `fetchLobby` returns the most recent snapshot.
- Database config (`server/src/config/env.ts`) enforces required env vars (`DB_HOST`, `DB_USER`, `DB_PORT`, `DB_PASSWORD`, `DB_NAME`, optional `PORT` default 4000) and exports a typed `AppConfig`.
- Database pool (`server/src/db/pool.ts`) is a singleton wrapper around `mysql2/promise` with `initDbPool`/`getDbPool`, supporting overrides for testing while guaranteeing only one pool exists at runtime.
- Production hosting instructions: build with `npm run server:build` then point Node.js or cPanel to `server/dist/server/src/index.js`, ensuring `client/dist/index.html` exists when the server resolves static assets.

## Client Foundation
- Vite + React shell (`client/`) currently contains the SPA entry points plus `index.html` and minimal styling.
- `npm run client:build` outputs `client/dist/` (assets + `index.html`), which the server now reliably serves so `/` is available in production.
- The build also produces the asset manifest Vite expects, allowing future phases to plug in more UI components without changing the server contract.

## Testing & Verification
- Jest config (`tests/jest.config.ts`) anchors the shared test suites run via `npm test`.
- `tests/server/app.test.ts` hits `GET /health` to verify the Express stack responds with the expected JSON payload.
- `tests/server/dbConnection.test.ts` mocks `mysql2/promise`, invokes `initDbPool`, and verifies the pool sees the configured host, database, and credentials.
- `tests/shared/shared-types.test.ts` asserts `GamePhase` and the fixed `PaintColor` palette are exported as promised, reinforcing deterministic canonical concepts.

## Environment & Deployment Notes
- Required environment variables: `DB_HOST`, `DB_USER`, `DB_PORT`, `DB_PASSWORD`, `DB_NAME`; optional `PORT` (defaults to 4000). Missing values cause an immediate startup failure so no invalid state can be assumed.
- Build workflow: `npm run server:build` compiles TypeScript into `server/dist`, `npm run client:build` produces `client/dist`, and `npm --workspace server run start` launches the production server that serves static assets plus the lobby endpoints.
- On cPanel or similar Node.js hosting, build both workspaces and set the startup file to `server/dist/server/src/index.js` so the server can resolve `client/dist/index.html`.

## Phase 1 Handoff
1. **Canonical Game Entities** – Expand shared models with studios, canvases, paint markets, and turn/day/phase metadata so the rules engine can act on a complete state snapshot.
2. **Rules Engine Builder** – Implement pure, reducer-like functions that apply player actions, enforce explicit state transitions, respect the AGENTS no-mutation rule, and never trust client data.
3. **Selling & Market Resolution** – Define canvas/paint market shifts, selling order, nutrition payouts, and the constraints around wild cubes to match the intended gameplay.
4. **Testing Expansion** – Create deterministic fixtures for selling rounds, scoring, starvation checks, and market behavior; every new behavior must be covered before advancing.
5. **Documentation Continuity** – Keep `docs/development-plan.md` and this summary updated with new decisions to ensure future phases can continue without guesswork.

This document captures the entire Phase 0 foundation so the next LLM can pick up Phase 1 implementation with confidence.
