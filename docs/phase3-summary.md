# Phase 3 Summary

This phase delivered the authoritative turn/action engine and synchronization layer outlined in the project plan.

## Turn & Action Control
- **TurnController + turnTypes** enforce phase order, per-phase action counts, daily nutrition effects, phase transitions, and first-player rotation. (`server/src/game/TurnController.ts`, `server/src/game/turnTypes.ts`)
- **Game reducer/validators** now rely on explicit action validation to enforce turn ownership, phase legality, and action limits for `DRAW_PAINT_CUBES`, `BUY_CANVAS`, `APPLY_PAINT_TO_CANVAS`, and `END_TURN`. (`server/src/game/reducer.ts`, `server/src/game/validators.ts`)

## Real-time Sync
- **WebSocket hooks** broadcast `GAME_STATE_UPDATED` events and reject invalid client intents while the server remains authoritative. (`server/src/realtime/gameRealtime.ts`)
- **Client lobby/game state hooks** consume the realtime feed, trigger actions through the WebSocket API, and keep presentation logic separate from rule enforcement. (`client/src/state/lobbyState.ts`)

## Authoritative Start Flow
- **Canvas deck loader** reads every canvas row from the `canvases` table, parses `layout_json`, and surfaces deterministic `CanvasDefinition` objects, including the new `filename` metadata. (`server/src/db/canvases.ts`)
- **GameSessionManager.startGame** became async, fetching the deck (with optional overrides) before invoking the reducer and shuffling it deterministically per game ID. (`server/src/game/GameSessionManager.ts`)
- **Lobby start route/service** no longer require the client to send the deck; they now await the async server-side flow. (`server/src/lobby`)
- **Client start payload** sends only paint bag/turn order, keeping canvas selection server-bound. (`client/src/state/lobbyState.ts`)

## Canvas Data Model
- Introduced the `filename` column on `canvases` and propagated that metadata through the shared `CanvasDefinition` type and the DB loader so assets can be linked correctly. (`sql/init-schema.sql`, `shared/types/canvas.ts`, `server/src/db/canvases.ts`)
- Documented the expected `layout_json` format for each canvas in `docs/canvas-json.md`.

## Testing
- Updated lobby/session tests to mock the new canvas loader, cover async start flows, and verify override behavior. (`tests/server/lobby/lifecycle.test.ts`, `tests/server/session/gameSessionManager.test.ts`)
- `npx jest --config tests/jest.config.ts --runInBand` runs cleanly after these changes.

All required Phase 3 features are implemented, validated, and documented.
