# Starving Artists Online – Development Plan

This plan tracks every milestone of the authoritative, deterministic multiplayer engine. Phases **0–3 are complete**; the descriptions below now reflect what shipped, what remains to be built, and how future phases should evolve based on the codebase today.

## Phase 0 – Foundations & Shared Infrastructure (Complete)
**Objective**: Establish sandboxed, consistent tooling across server/client/shared contexts so future LLM agents can focus on gameplay.

### What We Delivered
- **Monorepo layout with workspace scripts** running `server` and `client` builds independently (`package.json`, `tsconfig.*`, shared lint/test tooling).  
- **Express + Vite hosting stack** with `server/src/app.ts` serving JSON APIs (`/health`, `/lobby`) and static assets from `client/dist`, enabling SPA-first navigation without page reloads.  
- **Singleton MySQL pool / config layer** with `server/src/db/pool.ts`, `server/src/config/env.ts`, and verification tests (`tests/server/dbConnection.test.ts`) so database connections are deterministic and quarantined.
- **Shared TypeScript domain model** (`shared/types/*`) that defines GameState, PlayerState, Canvas, PaintCube, GamePhase, PaintColor palette, etc., guaranteeing the same types across UI, server logic, and tests.
- **Baseline tests & documentation** supporting the infrastructure: `tests/server/app.test.ts`, `tests/shared/shared-types.test.ts`, `docs/phase0-summary.md`, and this living plan.

### Notes
All environment variables required (DB + optional PORT) are enforced at startup. Production instructions remain: build both workspaces and point Node (`server/dist/server/src/index.js`) at the compiled SPA.

## Phase 1 – Core Game Data Model & Rules Engine (Complete)
**Objective**: Codify canonical game entities, enforce immutable state transitions, and provide deterministic rule guards.

### Key Outcomes
- **Comprehensive shared models** for canvases, paint cubes, turns, days, phases, and subscriptions to game snapshots (`shared/types`).  
- **Pure reducer architecture** (`server/src/game/reducer.ts`) that applies validated `GameAction` types (`server/src/game/actions.ts`) and writes snapshots (`server/src/game/snapshots.ts`), ensuring every mutation flows through explicit actions.
- **TurnController / validators** that enforce nutrition, phase transitions, and action legality (`server/src/game/TurnController.ts`, `server/src/game/validators.ts`, `server/src/game/turnTypes.ts`), plus helper utilities (`server/src/game/utils.ts`) for canvases/cubes.
- **Deterministic tests** that cover the engine behavior and selling resolution fallbacks (`tests/server/game/gameEngine.test.ts`).

### Observations
The rules engine accepts reducer actions based only on server-side validation; no client authority or randomness is introduced before actions hit `gameReducer`.

## Phase 2 – Multiplayer Game Lifecycle & Persistence (Complete)
**Objective**: Make sessions persistent, lobby-aware, and WebSocket-aware while keeping the server authoritative.

### Achievements
- **GameSession + GameSessionManager** (`server/src/game/GameSession.ts`, `server/src/game/GameSessionManager.ts`) manage in-memory state, emit lobby events, persist metadata via `server/src/db/sessionPersistence.ts`, and provide deterministic serialization to listeners.  
- **Lobby REST layer** (`server/src/lobby`) exposes create/join/leave/start routes while respecting host privileges.  
- **Realtime lobby sync** with `startLobbyRealtime` (not in scope for Phase 3 summary but referenced) and event-driven snapshots for every lobby change.  
- **Client lobby hook** (`client/src/state/lobbyState.ts`) consumes REST + WebSocket data, tracks player input, and exposes UI-friendly helpers such as `onWork`, `onBuyCanvas`, `onApplyPaint`, and `onEndTurn`.
- **Persistence mocks** ensure tests stay hermetic (`tests/server/lobby/lifecycle.test.ts`, `tests/server/session/gameSessionManager.test.ts`).

### Notes
Lobby logic enforces per-player order, reconnect support, and host-only start privileges. The API still responds deterministically when players join/leave/return.

## Phase 3 – Turn System, Action Pipeline & Real-Time Game Sync (Complete)
**Objective**: Wire server-side turn control, real-time action routing, event broadcasting, and authoritative canvas deck management.

### Delivered Systems
- **TurnController / reducers** now enforce Morning/Afternoon/Selling cycles, action limits (1 per action phase), first-player rotation, and nutrition decrements at the start of each day (`server/src/game/TurnController.ts`, `server/src/game/turnTypes.ts`).  
- **Action validation layer** ensures every intent respects turn ownership, phase legality, and resource constraints before applying `DRAW_PAINT_CUBES`, `BUY_CANVAS`, `APPLY_PAINT_TO_CANVAS`, `END_TURN`, and `DECLARE_SELL_INTENT` actions (`server/src/game/validators.ts`).
- **Realtime action/event layer** (`server/src/realtime/gameRealtime.ts`) translates WebSocket intents into reducer actions, rejects unknown or out-of-turn commands, and broadcasts `GAME_STATE_UPDATED` messages to every connected client while preserving authoritative state.
- **Server-driven canvas deck**: `fetchCanvasDefinitions` reads `layout_json` + `filename` directly from the `canvases` table, constructs deterministic `CanvasDefinition` objects, and feeds them to `GameSessionManager.startGame`, which now shuffles/overrides decks and no longer trusts client-supplied canvases (`server/src/db/canvases.ts`, `server/src/game/GameSessionManager.ts`, `server/src/game/types.ts`).
- **Lobby start overhaul**: `server/src/lobby/lobbyRoutes.ts` and `lobbyService` now await the async deck resolution, require only paint bag details from the client, and support optional admin overrides. The client’s start payload no longer sends a canvas deck (`client/src/state/lobbyState.ts`).  
- **Canvas format documentation**: `docs/canvas-json.md` records the exact JSON structure expected in the database and links each canvas to its asset `filename`.
- **Phase 3 tests** exercise all of the above and confirm out-of-turn guarding while mocking the DB deck loader (`tests/server/lobby/lifecycle.test.ts`, `tests/server/session/gameSessionManager.test.ts`).

### Observations
Every real-time action now originates from a server-validated reducer action, and the deck formation is deterministic even without client participation.
The realtime layer now ships both websocket and socket.io channels, documented in `docs/realtime-socket-io.md`, so hosts that block `wss://` can flip `REALTIME_WSS_ENABLED=false` while leaving `realtime.starvingartistsgame.com` as the authoritative gateway for both lobby and game interactions.

## Roadmap for Phases 4+
With Phases 0–3 done, future work should build atop the solid rules engine and realtime backbone. Adjustments to earlier plans are noted here so future teams work with the current reality:

### Phase 4 – Drag-and-Drop Painting Engine
*Deliverables*: Implement a presentation-only canvas renderer, a cube drag layer, drop validator tied to square `allowedColors`, and UI feedback that respects server responses.  
*Considerations*: The backend already encodes square positions via `docs/canvas-json.md`; the frontend should consume `CanvasDefinition.squares` and wire a drag layer that can highlight legal drops without authoritatively resolving them.  
*Testing*: Unit tests verifying invalid drops and wild cube limits can be client-side simulations paired with mocked server validation errors.

### Phase 5 – Shared Markets
*Deliverables*: Build Canvas Market slots (three visible slots, dynamic costs) and Paint Market pools, feed new reducer actions (`BUY_CANVAS`, paint supply) into the turn system, and expose selling round resolvers (cards return to bag, payment sequencing).  
*Notes*: The current reducer already handles canvas purchase and painting actions; focus on hooking market UI events into the same actions and ensuring the selling phase signals (e.g., `DECLARE_SELL_INTENT`) deliver fair payouts.

### Phase 6 – Selling Resolution & Endgame
*Deliverables*: Expand selling resolver to award stars/paint/food, enforce nutrition updates (already tracked in `TurnController`), declare winners once thresholds or starvation conditions are met, and implement endgame UI flow plus server-side finalization.  
*Testing*: Replay sequences that exhaust the paint bag, tie on stars, or starvation paths referencing `tests/server/game/gameEngine.test.ts`.

### Phase 7 – Admin Content Tooling
*Deliverables*: Build an authoring interface (likely still SPA-based) that writes valid entries into the `canvases` table with `layout_json` + `filename`. Provide import/export tooling (CSV/JSON) to keep production decks in sync.  
*Backlog*: Admin tools must honor `AGENTS.md` (no manual DB assumptions) and should reuse `docs/canvas-json.md` as the canonical schema for uploads.

### Phase 8+ – UI Polish, Observability, Release
*Deliverables*: Continue with gallery-quality theming (Phase 8), admin observability (Phase 9), and final release validation (Phase 10) as originally planned, but always surface deterministic states and avoid client-side authority leaks. Update this plan when new constraints or feature re-orderings arise.

Keep this document updated whenever a phase concludes or the real-time engine gains new responsibilities so future agents always know the current production capabilities and next priorities.
