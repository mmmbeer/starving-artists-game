# Real-time Socket.IO Fallback for Starving Artists Online

This document explains how the backend and the SPA coordinate on `realtime.starvingartistsgame.com` to cover both websocket (`wss://.../realtime/*`) and socket.io transports. The socket.io path takes over whenever the shared host blocks `wss`, so every lobby snapshot, player action, and game state update is still served deterministically by the server.

## Transport layout

- **Primary websocket endpoints**  
  - `/realtime/lobby` streams lobby snapshots and `GAME_STARTED` events.  
  - `/realtime/game` streams authoritative `GAME_STATE_UPDATED` frames and accepts `GAME_ACTION` intents.  
  These endpoints are proxied directly to the Node backend when `REALTIME_WSS_ENABLED=true`.

- **Socket.IO fallback namespace**  
  - Clients connect to `https://realtime.starvingartistsgame.com/lobby` or `/game` with `io()` while pointing `path` at the backend `REALTIME_SOCKET_IO_PATH` (default `/realtime/socket.io`).  
  - Each namespace (`/lobby` and `/game`) requires the same query parameters (`gameId` and `playerId`) as the websocket version to authorize the session.
  - The backend emits every realtime payload over `'realtime_message'` and listens for `'game_action'` events from authorized players.

## Message contracts

- **Lobby messages (both transports)**  
  ```
  { type: 'LOBBY_STATE', payload: LobbySnapshot, reason?: LobbyEventReason }
  { type: 'GAME_STARTED', payload: GameState }
  { type: 'ERROR', payload: { message: string } }
  ```
  The client immediately applies `LOBBY_STATE`, resets the local game state when the phase returns to `LOBBY`, and surfaces `ERROR` messages if the connection becomes invalid.

- **Game messages**  
  ```
  { type: 'GAME_STATE_UPDATED', payload: { state: GameState, lastAction?: GameActionSummary } }
  { type: 'ERROR', payload: { message: string } }
  ```
  Clients append the optional `lastAction` to their history and throw when they receive `ERROR` while issuing in-game commands.

- **Client-to-server actions**  
  ```
  io.emit('game_action', { type: 'GAME_ACTION', payload: GameActionIntent })
  websocket.send(JSON.stringify({ type: 'GAME_ACTION', payload: GameActionIntent }))
  ```
  The reducer treats both transports identically, so the only difference is the envelope used to exchange JSON.

## Environment configuration

- `REALTIME_WSS_ENABLED` (`true` by default) lets you disable the websocket servers entirely (set it to `false` on hosts that strip `Upgrade` headers).  
- `REALTIME_SOCKET_IO_ENABLED` (`true` by default) keeps the socket.io listeners registered so the SPA can fall back automatically.  
- `REALTIME_SOCKET_IO_PATH` (`/realtime/socket.io` by default) is the HTTP path that Apache rewrites to `127.0.0.1:4000` for the socket.io engine; keep the client `VITE_REALTIME_SOCKET_IO_PATH` in sync with this value.

## Client fallback strategy

1. The SPA constructs `primary` and `fallback` websocket bases using `VITE_REALTIME_URL` and the current host.  
2. It tries to open `/realtime/lobby` + `/realtime/game` over websocket while tracking `gameId`+`playerId`.  
3. If the websocket handshake fails on both bases, it switches to socket.io by connecting to `https://realtime.starvingartistsgame.com/lobby` or `/game` (the same host) and passing `path=VITE_REALTIME_SOCKET_IO_PATH`.  
4. Socket.io connections send `"realtime_message"` events to update lobby/game state and emit `"game_action"` when the player works, paints, or ends their turn.  
5. The SPA exposes a unified API (`setError`, `connectionStatus`, `resetGameState`, etc.) so UI components never need to know which transport is active.

## Monitoring

The `/realtime/health` endpoint reports `[lobby, game]` snapshots regardless of transport. Query it through whichever hostname you proxy (`https://www.starvingartistsgame.com/realtime/health` or `https://realtime.starvingartistsgame.com/realtime/health`) to verify both websocket and socket.io lanes are alive.

## Reference

- Server implementation: `server/src/realtime/{lobbyRealtime.ts,gameRealtime.ts}` and `server/src/index.ts` spawn both `ws` and socket.io listeners and share the same event streams (`lobbySessionManager`, `GameStateUpdatedEvent`).  
- Client implementation: `client/src/state/lobbyState.ts` prefers websockets, tracks fallback state, and uses `SOCKET_IO_PATH` + `.env` overrides when requiring the socket.io transport.  
- The new doc `docs/server-setup.md` outlines how to reverse proxy `/realtime/*` plus `/realtime/socket.io` so the fallback never sees a stale host.
