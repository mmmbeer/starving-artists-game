# Starving Artists

A complete online implementation of Mike Wokasch's *Starving Artists*. The
application runs on OpenAI Sites with a Vinext frontend and a D1-backed,
server-authoritative multiplayer game.

## Player experience

- Create a one-to-four-player game from the landing page
- Invite players with an eight-character code or shareable URL; legacy
  six-character links remain valid
- Start from a live lobby and reconnect from the same browser
- Play morning and afternoon actions with continuously polled board updates
- Work, buy canvases, trade paint, and drag or tap up to four cubes onto a canvas
- Declare completed paintings for sale, resolve market collection, and finish
  through the official fame, painting-count, starvation, or solo-deck endgame

The card importer in `scripts/ingest-canvases.py` normalizes the mixed source
orientations, converts all 148 scans to compact WebP assets, and reads each
card's printed color requirements and reward values into
`app/lib/canvas-data.ts`.

## Architecture

- `app/components/GameApp.tsx` — game-session orchestration and route state
- `app/components/game/` — focused lobby, board, studio, museum, tutorial, and
  action-modal components
- `app/components/curator/` — curator state controller and focused helpers
- `app/components/ui/` — shared modal and confirmation primitives
- `app/lib/game-engine/` — deterministic rules, validation, player setup, and
  reducer modules; `app/lib/engine.ts` is their compatibility barrel
- `app/lib/http-client.ts`, `game-api.ts`, and `curator-api.ts` — shared HTTP
  parsing, typed API calls, retry classification, and user-safe error messages
- `app/lib/game-store.ts` and `game-store-db.ts` — D1 persistence, optimistic
  concurrency, schema access, player credentials, and action idempotency
- `app/api/games/` — create, join, poll, and action routes
- `app/styles/` — styles split by feature area
- `db/schema.ts` and `drizzle/` — database schema and migration

The server owns every transition. Clients submit an expected version and an
idempotency key, while public responses conceal the shuffled canvas and paint
bags. Retryable network and server failures use bounded backoff, version
conflicts reconcile with authoritative state, and invalid credentials are
discarded so the interface can recover without preserving a broken session.

`npm run check:architecture` enforces fewer than 500 lines for maintained
TypeScript, JavaScript, Python, and shell source files. It is also part of the
lint command.

## Development

Requires Node.js 22.13 or newer.

```bash
npm run dev
npm test
```

To rebuild the optimized card library from a checkout of the original source:

```bash
python3 scripts/ingest-canvases.py /path/to/assets/canvases \
  --public public/canvases \
  --data app/lib/canvas-data.ts \
  --report canvas-ingest-report.json
```
