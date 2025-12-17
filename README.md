# starving-artists-game

This repository scaffold contains Phase 0 of **Starving Artists Online** with separate backend, frontend, shared types, and verification tooling.

## Getting Started

1. Run `npm install` from the repository root to install workspace dependencies.
2. Supply the `.env` variables that are already referenced (`DB_HOST`, `DB_USER`, `DB_PORT`, `DB_PASSWORD`, `DB_NAME`).
3. Use `npm run server:dev` or `npm run client:dev` to start each workspace in development mode.

## Testing

Execute `npm test` to run the shared Jest suite covering the Express health check, the mocked database pool, and shared types.

## Database Setup

Apply `sql/init-schema.sql` to create the initial MySQL schema (users, games, game_players, snapshot store, and canvas catalog).
