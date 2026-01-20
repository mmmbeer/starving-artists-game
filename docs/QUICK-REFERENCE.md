# Quick Reference: Realtime Communication Architecture

## Connection Endpoints

### Production (Shared Hosting)
```
Domain: https://www.starvingartistsgame.com

Health Check:     /health
Realtime Health:  /realtime/health

API:
  POST /api/lobby/create
  POST /api/lobby/:gameId/join
  POST /api/lobby/:gameId/leave
  POST /api/lobby/:gameId/start

Socket.IO:
  Lobby: /lobby (path: /socket.io)
  Game:  /game  (path: /socket.io)

WebSocket (fallback):
  Lobby: /realtime/lobby
  Game:  /realtime/game
```

### Development (Local)
```
Frontend: http://localhost:5173
Backend:  http://localhost:4000

Same endpoint paths as production
```

## Environment Variables

### Server (`server/.env`)
```bash
PORT=4000
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=starving_artists
DB_PORT=3306
REALTIME_SOCKET_IO_ENABLED=true
REALTIME_WSS_ENABLED=true
SOCKET_IO_PATH=/socket.io
ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
```

### Client (`client/.env` - Optional)
```bash
# Only for development
VITE_API_BASE=http://localhost:4000
```

## Transport Priority

1. **Socket.IO** (Primary)
   - Path: `/socket.io`
   - Tries WebSocket, falls back to polling
   - Works through HTTP proxies
   - Best for shared hosting

2. **WebSocket** (Fallback)
   - Paths: `/realtime/lobby`, `/realtime/game`
   - Lower latency when available
   - Requires `mod_proxy_wstunnel`

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start backend dev server
npm run server:dev

# Start frontend dev server
npm run client:dev

# Run tests
npm test
```

### Production
```bash
# Build backend
npm run server:build

# Build frontend
npm run client:build

# Start production server
npm run server:start
```

### Deployment (cPanel)
```bash
# Via SSH
cd ~/starving-artists
npm install
npm run server:build
npm run client:build

# Restart via cPanel UI:
# Setup Node.js App → Restart Application
```

## Testing Connections

### Browser Console

**Test Socket.IO:**
```javascript
const socket = io('/lobby', {
  path: '/socket.io',
  query: { gameId: 'test-123', playerId: 'player-1' }
});
socket.on('connect', () => console.log('Connected'));
```

**Test WebSocket:**
```javascript
const ws = new WebSocket('wss://yourdomain.com/realtime/lobby?gameId=test-123&playerId=player-1');
ws.onopen = () => console.log('Connected');
```

### cURL

**Health Check:**
```bash
curl https://yourdomain.com/health
# {"status":"ok"}
```

**Realtime Health:**
```bash
curl https://yourdomain.com/realtime/health
# {"status":"ok","timestamp":"...","lobby":{...},"game":{...}}
```

**Socket.IO Handshake:**
```bash
curl http://localhost:4000/socket.io/?EIO=4&transport=polling
# 0{"sid":"...","upgrades":["websocket"],...}
```

## Apache Configuration

### .htaccess Location
```
/home/username/public_html/.htaccess
```

### Key Proxy Rules
```apache
# Socket.IO
ProxyPass "/socket.io" "http://127.0.0.1:4000/socket.io"

# API
ProxyPass "/api/lobby" "http://127.0.0.1:4000/api/lobby"

# WebSocket (if mod_proxy_wstunnel available)
ProxyPass "/realtime/lobby" "ws://127.0.0.1:4000/realtime/lobby"
ProxyPass "/realtime/game" "ws://127.0.0.1:4000/realtime/game"
```

## Troubleshooting Quick Fixes

### "Connection Refused"
```bash
# Check Node.js is running
curl http://localhost:4000/health

# Check process
ps aux | grep node

# Restart (cPanel or PM2)
pm2 restart starving-artists
```

### "CORS Error"
```bash
# Add your domain to ALLOWED_ORIGINS in server/.env
ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com

# Restart application
```

### "Socket.IO Connection Failed"
```bash
# 1. Check .htaccess exists in public_html
ls -la ~/public_html/.htaccess

# 2. Test Socket.IO endpoint
curl http://localhost:4000/socket.io/

# 3. Check Apache modules
apachectl -M | grep proxy
```

### "WebSocket Upgrade Failed"
```
This is OK! Socket.IO will use polling instead.

If you need WebSocket:
- Contact hosting provider to enable mod_proxy_wstunnel
- Or accept Socket.IO polling (works fine)
```

## File Locations

```
Application Root: ~/starving-artists/

Config Files:
  server/.env              - Server configuration
  client/.env              - Client configuration (optional)
  .htaccess               - Apache proxy rules

Build Output:
  server/dist/            - Compiled server code
  client/dist/            - Compiled client code

Logs:
  ~/starving-artists/logs/
  /var/log/apache2/error_log

Database:
  sql/init-schema.sql     - Database schema
```

## Message Types

### Lobby Messages (Received)
```javascript
{
  type: 'LOBBY_STATE',
  payload: { gameId, phase, players, ... }
}

{
  type: 'GAME_STARTED',
  payload: { /* GameState */ }
}

{
  type: 'ERROR',
  payload: { message: 'Error description' }
}
```

### Game Messages (Received)
```javascript
{
  type: 'GAME_STATE_UPDATED',
  payload: {
    state: { /* GameState */ },
    lastAction: { /* Action Summary */ }
  }
}
```

### Game Actions (Sent)
```javascript
socket.emit('game_action', {
  type: 'GAME_ACTION',
  payload: {
    type: 'DRAW_PAINT_CUBES',  // or BUY_CANVAS, APPLY_PAINT_TO_CANVAS, etc.
    payload: { /* action data */ }
  }
});
```

## Port Reference

| Service | Port | Access |
|---------|------|--------|
| Backend API | 4000 | Internal (via Apache proxy) |
| Frontend Dev | 5173 | Development only |
| Apache HTTP | 80 | External |
| Apache HTTPS | 443 | External |
| MySQL | 3306 | localhost only |

## Security Notes

- All sensitive data in `.env` files (never commit)
- Database accessible from localhost only
- CORS restricted to allowed origins
- Use HTTPS in production (Let's Encrypt via cPanel)
- File permissions: `.htaccess` (644), `.env` (600)

## Support Resources

- **Deployment Guide**: docs/shared-hosting-deployment.md
- **Architecture**: docs/realtime-socket-io.md
- **Migration**: docs/MIGRATION-SINGLE-DOMAIN.md
- **Development Plan**: docs/development-plan.md
- **Game Rules**: docs/game-rules.md

---

**Quick Reference Version**: 1.0  
**Last Updated**: January 2025  
**Architecture**: Single Domain with Socket.IO Primary
