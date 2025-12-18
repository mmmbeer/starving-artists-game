# Phase 1 Summary

## Canonical game entities & state
- Shared models now expose `GameState`, `PlayerState`, `StudioState`, `CanvasState`, `PaintCube`, and `GamePhase`, keeping every agent aligned about the fixed palette (`red` through `wild`), turn/day metadata, markets, and studio layout (`shared/types/game.ts`, `shared/types/canvas.ts`, `shared/types/paint.ts`).
- Game snapshots are staged for persistence via the lightweight `server/src/game/snapshots.ts` ➜ `server/src/db/snapshots.ts` pipeline so every authoritative transition is recorded without mutating previous states.

## Reducer-based rules engine
- `gameReducer` in `server/src/game/reducer.ts` implements all Phase 1 transitions (initialization, phase advancement, drawing cubes, buying canvases, applying paint, declaring sell intents) as pure functions that clone and extend state, enforcing slot costs, turn/phase progression, and explicit nutrition/phase bookkeeping.
- `server/src/game/validators.ts` ensures Phase 1 rules never trigger invalid transitions: phase gating per action, slot availability, color constraints (including the “one wild per canvas” rule), and completed-only sell intents.
- Supporting helpers (`server/src/game/utils.ts`) provide deterministic bag draws, canvas completeness checks, wild cube counting, and player/canvas lookups so every mutation path is explicit.

## Lobby + client instrumentation
- Lobby endpoints (`server/src/lobby/lobbyRoutes.ts`) now expose POST `/lobby/create`, `/lobby/:id/join`, `/lobby/:id/start`, `/lobby/:id/advance-phase`, and GET `/lobby/:id`, each wired to the reducer-powered service (`server/src/lobby/lobbyService.ts`) that maintains the in-memory store and dispatches validated actions.
- `client/src/components/PhaseOnePanel.tsx` renders the Phase 1 sandbox UI, seeds sample paint bags/canvases/market data, and calls every lobby route (create/join/start/advance/refresh) so the front end can drive and observe the authoritative engine without duplicating rules.
- Vite proxies `/lobby` to the backend during development (`client/vite.config.ts`), fulfilling the “no client-side authority” mandate.

## Deterministic rules & verification
- `tests/server/game/gameEngine.test.ts` exercises the reducer with canonical fixtures, proving initialization, deterministic draw order, slot negotiations, wild-cube limits, completion enforcement, sell intent guards, and immutability of prior state.
- `tests/server/lobby/lifecycle.test.ts` exercises the Express lobby endpoints end-to-end (create/join/start/advance) to confirm the Phase 1 flows are callable via HTTP and that the reducer’s transitions are surfaced through the APIs.
- Shared-type coverage (`tests/shared/shared-types.test.ts`) plus the server health/db tests ensure foundational invariants remain stable as future phases add behavior.

## Phase 1 readiness
- The current stack satisfies all Phase 1 deliverables: shared canonical entities, reducer-driven rules, lobby endpoints for all phase transitions, a sandbox UI that surfaces the state, and deterministic tests capturing every rule path. This prepares the project for Phase 2 multiplayer lifecycle work without partial deliverables or unstated assumptions.
