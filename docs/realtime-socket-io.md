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

## Shared Hosting Compatibility

### Apache Configuration (.htaccess)

The application includes a comprehensive `.htaccess` file for Apache shared hosting:

```apache
# Socket.IO (primary transport)
ProxyPass "/socket.io" "http://127.0.0.1:4000/socket.io" retry=0
ProxyPassReverse "/socket.io" "http://127.0.0.1:4000/socket.io"

# WebSocket fallback (requires mod_proxy_wstunnel)
ProxyPass "/realtime/lobby" "ws://127.0.0.1:4000/realtime/lobby" retry=0
ProxyPass "/realtime/game" "ws://127.0.0.1:4000/realtime/game" retry=0

# REST API
ProxyPass "/api/lobby" "http://127.0.0.1:4000/api/lobby" retry=0
```

### cPanel Node.js Setup

1. **Create Node.js Application** (cPanel > Setup Node.js App)
   - Application root: `/home/username/starving-artists`
   - Application URL: `yourdomain.com`
   - Application startup file: `server/dist/server/src/index.js`
   - Node.js version: 18.x or higher

2. **Set Environment Variables** in cPanel interface:
   ```
   PORT=4000
   DB_HOST=localhost
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_database
   REALTIME_SOCKET_IO_ENABLED=true
   REALTIME_WSS_ENABLED=true
   SOCKET_IO_PATH=/socket.io
   ```

3. **Start Application** via cPanel interface

### Why This Works on Shared Hosting

**Socket.IO Advantages**:
- Uses standard HTTP/HTTPS first
- Falls back to long-polling (no special Apache modules needed)
- Works even when `mod_proxy_wstunnel` is unavailable
- Automatic reconnection and heartbeat

**Single Domain Benefits**:
- No DNS configuration for subdomains
- Single SSL certificate needed
- Simpler Apache proxy rules
- Works with most shared hosting plans

**Graceful Degradation**:
1. Client tries Socket.IO via `/socket.io` → Usually succeeds
2. Socket.IO tries WebSocket upgrade → May fail on restrictive hosts
3. Socket.IO falls back to polling → Always works
4. If Socket.IO completely blocked → Client tries native WebSocket
5. If WebSocket also blocked → Clear error message to user

## Health Monitoring

### Health Check Endpoint

```bash
# Check overall application health
curl https://yourdomain.com/health

# Response
{
  "status": "ok"
}
```

### Realtime Health Endpoint

```bash
# Check realtime transport status
curl https://yourdomain.com/realtime/health

# Response
{
  "status": "ok",
  "timestamp": "2025-01-20T...",
  "lobby": {
    "activeGames": 2,
    "activeConnections": 5,
    "lastBroadcastAt": "2025-01-20T..."
  },
  "game": {
    "activeGames": 1,
    "activeConnections": 4,
    "lastBroadcastAt": "2025-01-20T..."
  }
}
```

### Browser Console Testing

Test Socket.IO connection:
```javascript
const socket = io('/lobby', {
  path: '/socket.io',
  query: { gameId: 'test-123', playerId: 'player-1' }
});

socket.on('connect', () => console.log('✓ Socket.IO connected'));
socket.on('connect_error', (err) => console.error('✗ Socket.IO error:', err));
socket.on('realtime_message', (msg) => console.log('Message:', msg));
```

Test WebSocket connection:
```javascript
const ws = new WebSocket('wss://yourdomain.com/realtime/lobby?gameId=test-123&playerId=player-1');
ws.onopen = () => console.log('✓ WebSocket connected');
ws.onerror = (err) => console.error('✗ WebSocket error:', err);
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
```

## Troubleshooting

### Socket.IO Connection Fails

**Check 1: Apache Proxy**
```bash
# Verify proxy is active
curl -I http://localhost:4000/socket.io/
# Should return Socket.IO handshake response
```

**Check 2: Node.js Running**
```bash
# Check if Node.js is listening
netstat -tulpn | grep :4000
# or
curl http://localhost:4000/health
```

**Check 3: CORS Headers**
- Verify `ALLOWED_ORIGINS` includes your domain
- Check browser console for CORS errors

### WebSocket Upgrade Fails (101)

**Cause**: `mod_proxy_wstunnel` not enabled

**Solution**: This is OK! Socket.IO will use polling instead. If you need WebSocket:
1. Contact hosting provider to enable `mod_proxy_wstunnel`
2. Or use Socket.IO polling (no action needed - it's automatic)

### "Connection Refused" Errors

**Check**:
1. Node.js application is running (`/health` endpoint works)
2. `.htaccess` file is in public_html directory
3. Apache has proxy modules enabled
4. PORT environment variable is 4000

### Connection Works Locally But Not on Server

**Check**:
1. Domain DNS is pointing to server
2. SSL certificate is valid
3. Firewall allows port 4000 (for internal proxy)
4. `.htaccess` rules are being applied
