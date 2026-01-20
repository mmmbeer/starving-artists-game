# Real-time Communication for Starving Artists Online (Shared Hosting)

This document explains how the backend and frontend coordinate realtime communication on a single domain using Socket.IO (primary) and WebSocket (fallback) for shared hosting environments.

## Architecture Overview

The application now uses a **single-domain architecture** optimized for traditional shared hosting (Apache/cPanel):

- **Primary Transport**: Socket.IO (better compatibility with shared hosting, works through HTTP polling when WebSocket is blocked)
- **Fallback Transport**: WebSocket (if Socket.IO fails and hosting supports WebSocket upgrades)
- **Single Domain**: All communication happens through the same domain (e.g., `www.starvingartistsgame.com`)
- **No Subdomain Required**: Removed dependency on `realtime.starvingartistsgame.com`

## Transport Layout

### Primary: Socket.IO
- **Path**: `/socket.io` (standard Socket.IO path)
- **Namespaces**: 
  - `/lobby` - Lobby state synchronization
  - `/game` - Game state and player actions
- **Transports**: Attempts WebSocket first, falls back to HTTP long-polling automatically
- **Connection**: Same domain as web application
  ```javascript
  io('/lobby', {
    path: '/socket.io',
    query: { gameId: 'game-123', playerId: 'player-1' }
  })
  ```

### Fallback: WebSocket
- **Lobby Path**: `/realtime/lobby`
- **Game Path**: `/realtime/game`
- **Protocol**: `wss://` (HTTPS) or `ws://` (HTTP)
- **Connection**: Same domain as web application
  ```javascript
  new WebSocket('wss://yourdomain.com/realtime/lobby?gameId=game-123&playerId=player-1')
  ```

Both transports require `gameId` and `playerId` query parameters for authorization.

## Message Contracts

All messages use the same structure regardless of transport:

### Lobby Messages (Both Transports)
```json
{
  "type": "LOBBY_STATE",
  "payload": { /* LobbySnapshot */ },
  "reason": "PLAYER_JOINED" // optional
}

{
  "type": "GAME_STARTED",
  "payload": { /* GameState */ }
}

{
  "type": "ERROR",
  "payload": { "message": "Error description" }
}
```

### Game Messages (Both Transports)
```json
{
  "type": "GAME_STATE_UPDATED",
  "payload": {
    "state": { /* GameState */ },
    "lastAction": { /* GameActionSummary */ } // optional
  }
}

{
  "type": "ERROR",
  "payload": { "message": "Error description" }
}
```

### Client-to-Server Actions

**Socket.IO**:
```javascript
socket.emit('game_action', {
  type: 'GAME_ACTION',
  payload: { /* GameActionIntent */ }
})
```

**WebSocket**:
```javascript
websocket.send(JSON.stringify({
  type: 'GAME_ACTION',
  payload: { /* GameActionIntent */ }
}))
```

The server treats both identically - the only difference is the transport envelope.

## Environment Configuration

### Server Configuration (`server/.env`)

```bash
# Realtime Transport Settings
REALTIME_SOCKET_IO_ENABLED=true    # Enable Socket.IO (primary transport)
REALTIME_WSS_ENABLED=true          # Enable WebSocket (fallback transport)
SOCKET_IO_PATH=/socket.io          # Standard Socket.IO path

# Server Port
PORT=4000

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://www.starvingartistsgame.com,https://starvingartistsgame.com
```

**Key Changes from Previous Architecture**:
- `SOCKET_IO_PATH` changed from `/realtime/socket.io` to `/socket.io` (standard, better Apache compatibility)
- Order reversed: Socket.IO is now primary, WebSocket is fallback
- No subdomain configuration needed

### Client Configuration

The client automatically detects the current domain and uses it for all connections. No environment variables required for production!

**Optional Development Override** (`client/.env`):
```bash
# Only needed for local development against remote server
VITE_API_BASE=http://localhost:4000
```

**How it works**:
- Production: Client uses `window.location.host` (same domain)
- Development: Falls back to `VITE_API_BASE` if specified
- Fully domain-agnostic - works with any domain name

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
