# Starving Artists Online - Development Plan

This plan tracks milestones for the authoritative, deterministic multiplayer engine and the production UI.
Last reviewed: January 31, 2026. Phases 0-7 are complete.

## Phase 0 - Foundations and Infrastructure (Complete)
Objective: Establish a stable server, database, and deployment baseline.

Delivered
- Express app with EJS views and static assets (server-rendered pages + client JS).
- Environment and database configuration with MySQL connectivity and session support.
- Core project structure for services, routes, database access, sockets, and utilities.
- Documentation for local development and deployment.

## Phase 1 - Core Game Data Model and Rules Engine (Complete)
Objective: Codify canonical game entities and deterministic rule enforcement.

Delivered
- TypeScript domain models in `server/src/models/types.ts`.
- Deterministic services for paint bag, canvas completion, selling phase, and score tracking.
- Action validation and explicit state transitions through `server/src/services/game/*`.

## Phase 2 - Multiplayer Lifecycle and Persistence (Complete)
Objective: Persistent lobbies, player sessions, and authoritative state storage.

Delivered
- Lobby creation/join/leave/start routes with session-bound player identity.
- Database persistence for games, players, game state, and canvas definitions.
- Session store integration in `server/src/services/session/mysqlSessionStore.ts`.

## Phase 3 - Turn System and Real-Time Game Sync (Complete)
Objective: Wire turn control, phase transitions, and real-time action routing.

Delivered
- Turn management and day/night/selling progression in `server/src/services/game`.
- Socket.IO lobby + game namespaces in `server/src/socket/*` with full state broadcasting.
- REST action endpoints in `server/src/routes/game.routes.ts` for non-socket clients.

## Phase 4 - Drag-and-Drop Painting Engine (Complete)
Objective: Client-side painting workflow that respects server authority.

Delivered
- Drag-and-drop painting with validation in `server/public/js/game/drag-drop.js`.
- Canvas grid renderer and studio UX in `server/public/js/game/game-ui.js`.
- Visual feedback for valid/invalid drops and pending paint commits.

## Phase 5 - Shared Markets (Complete)
Objective: Canvas and paint markets with deterministic pricing and supply.

Delivered
- Canvas deck + market management in `server/src/services/canvas/canvasMarket.ts`.
- Paint bag + market operations in `server/src/services/paint/paintBag.ts`.
- Buy-canvas flow that updates markets, player inventory, and deck state.

## Phase 6 - Selling Resolution and Endgame (Complete)
Objective: Selling payouts, nutrition/score updates, and win/lose logic.

Delivered
- Selling phase collection logic in `server/src/services/game/sellingPhase.ts`.
- Win condition and tiebreak logic in `server/src/services/score/scoreTracker.ts`.
- Game-end signaling through sockets and the game UI.

## Phase 7 - Admin Content Tooling (Complete)
Objective: Admin UI for canvas authoring and content management.

Delivered
- Admin dashboard, canvas list, and canvas editor views in `server/views/pages/admin`.
- Admin API endpoints in `server/src/routes/admin.routes.ts`.
- Canvas file ingestion from `dist/server/assets/canvases`.

## Phase 8+ - Release Hardening and QA (Remaining)
Objective: Final validation, polish, and production readiness.

Next priorities
- Expand automated tests to cover full turn cycles, selling resolution, and win conditions.
- Add end-to-end multiplayer tests (Socket.IO) for reconnect and late join.
- Add observability (structured logs, error reporting, health checks).
- Audit security (rate limits, input validation consistency, session hardening).
- Final UI polish and accessibility pass.

Design documentation
- In-game single-screen layout spec: `docs/in-game-ui.md`.

Keep this document updated whenever a phase concludes or architecture changes, so future work stays aligned with the codebase.
