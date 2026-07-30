# Starving Artists

A complete online implementation of Mike Wokasch's *Starving Artists*. The
application runs on OpenAI Sites with a Vinext frontend and a D1-backed,
server-authoritative multiplayer game.

## Player experience

- Create a one-to-four-player game from the landing page
- Invite players with a six-character code or shareable URL
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

- `app/components/GameApp.tsx` — responsive game and lobby interface
- `app/lib/engine.ts` — deterministic rules reducer and validation
- `app/lib/game-store.ts` — D1 persistence, optimistic concurrency, player
  credentials, and action idempotency
- `app/api/games/` — create, join, poll, and action routes
- `db/schema.ts` and `drizzle/` — database schema and migration

The server owns every transition. Clients submit an expected version and an
idempotency key, while public responses conceal the shuffled canvas and paint
bags.

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
