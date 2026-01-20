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

## Client Connection Strategy

The frontend automatically handles transport selection and fallback:

### 1. Connection Initialization
```javascript
// Client detects current domain automatically
const protocol = window.location.protocol; // 'https:' or 'http:'
const host = window.location.host;         // 'www.starvingartistsgame.com'
```

### 2. Primary: Socket.IO Connection
```javascript
// Attempt Socket.IO first (better shared hosting support)
const socket = io('/lobby', {
  path: '/socket.io',
  transports: ['websocket', 'polling'], // Try WebSocket, fall back to polling
  query: { gameId, playerId }
});
```

**Socket.IO Benefits**:
- Works through HTTP proxies
- Automatic reconnection
- Falls back to long-polling if WebSocket blocked
- Better compatibility with Apache shared hosting

### 3. Fallback: WebSocket Connection
```javascript
// If Socket.IO fails completely, try native WebSocket
const ws = new WebSocket(`wss://${host}/realtime/lobby?gameId=${gameId}&playerId=${playerId}`);
```

**WebSocket Benefits**:
- Lower latency (when available)
- Less overhead than Socket.IO
- Direct connection without HTTP polling

### 4. Error Handling
```javascript
// Socket.IO connection error
socket.on('connect_error', () => {
  // Automatically tries WebSocket fallback
});

// WebSocket connection error
ws.onerror = () => {
  // Reports: "Both Socket.IO and WebSocket unavailable"
};
```

The client seamlessly handles:
- Transport selection
- Automatic fallback
- Reconnection attempts
- Error reporting

## Monitoring

The `/realtime/health` endpoint reports `[lobby, game]` snapshots regardless of transport. Query it through whichever hostname you proxy (`https://www.starvingartistsgame.com/realtime/health` or `https://realtime.starvingartistsgame.com/realtime/health`) to verify both websocket and socket.io lanes are alive.

## Reference

- Server implementation: `server/src/realtime/{lobbyRealtime.ts,gameRealtime.ts}` and `server/src/index.ts` spawn both `ws` and socket.io listeners and share the same event streams (`lobbySessionManager`, `GameStateUpdatedEvent`).  
- Client implementation: `client/src/state/lobbyState.ts` prefers websockets, tracks fallback state, and uses `SOCKET_IO_PATH` + `.env` overrides when requiring the socket.io transport.  
- The new doc `docs/server-setup.md` outlines how to reverse proxy `/realtime/*` plus `/realtime/socket.io` so the fallback never sees a stale host.
