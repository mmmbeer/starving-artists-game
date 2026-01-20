# Changelog: Realtime Architecture Redesign

## Version 2.0 - Single Domain Architecture (January 2025)

### Overview
Redesigned realtime communication system to run entirely from a single domain, optimized for traditional shared hosting (Apache/cPanel) environments.

---

## Breaking Changes

### 🔴 Transport Priority Reversed
- **Old**: WebSocket primary, Socket.IO fallback
- **New**: Socket.IO primary, WebSocket fallback
- **Reason**: Better compatibility with shared hosting, Socket.IO handles proxies and restrictions better

### 🔴 Domain Architecture Changed
- **Old**: Required separate subdomain (`realtime.starvingartistsgame.com`)
- **New**: Single domain, automatically uses current host
- **Reason**: Simplified setup, no subdomain DNS/SSL needed

### 🔴 Socket.IO Path Changed
- **Old**: `/realtime/socket.io`
- **New**: `/socket.io` (standard)
- **Reason**: Better Apache compatibility, follows Socket.IO conventions

### 🔴 API Routes Prefixed
- **Old**: `/lobby/*`
- **New**: `/api/lobby/*`
- **Reason**: Better organization, clearer separation of concerns

### 🔴 Client Environment Variables Removed
- **Old**: Required `VITE_REALTIME_URL`, `VITE_SITE_ORIGIN`, `VITE_REALTIME_SOCKET_IO_PATH`
- **New**: Auto-detection, no config needed for production
- **Reason**: Domain-agnostic design, automatic host detection

---

## New Features

### ✅ Shared Hosting Optimized
- Works on Apache/cPanel shared hosting
- Includes .htaccess configuration
- cPanel Node.js app compatible
- No special server modules required for basic functionality

### ✅ Domain Agnostic
- Automatically detects current domain
- Works with any domain name
- No hardcoded URLs
- Easy to move between environments

### ✅ Improved Fallback Chain
1. Socket.IO WebSocket transport (best)
2. Socket.IO HTTP polling (if WebSocket blocked)
3. Native WebSocket (if Socket.IO completely fails)
4. Clear error messages if all transports fail

### ✅ Comprehensive Documentation
- Complete shared hosting deployment guide
- Migration guide from old architecture
- Quick reference for common tasks
- Troubleshooting section

---

## File Changes

### Configuration Files

#### Created
- ✅ `.htaccess` - Apache reverse proxy configuration
- ✅ `docs/shared-hosting-deployment.md` - Complete deployment guide
- ✅ `docs/MIGRATION-SINGLE-DOMAIN.md` - Migration from v1.0 guide
- ✅ `docs/QUICK-REFERENCE.md` - Quick reference guide

#### Modified
- ✅ `server/.env.example` - Updated Socket.IO path, reordered priorities
- ✅ `client/.env.example` - Removed subdomain variables, simplified
- ✅ `docs/realtime-socket-io.md` - Complete rewrite for new architecture
- ✅ `docs/development-plan.md` - Updated Phase 3 summary
- ✅ `README.md` - Complete rewrite with new information

### Server-Side Code

#### Modified Files
```
server/src/config/env.ts
  - Reversed transport priority (Socket.IO first)
  - Changed socketIoPath default: /realtime/socket.io → /socket.io
  - Reordered RealtimeConfig interface

server/src/config/origins.ts
  - Removed realtime.starvingartistsgame.com from defaults
  - Added localhost:5173 and localhost:4000 for development

server/src/app.ts
  - Changed route: /lobby → /api/lobby
  - Maintains backward compatibility via proxy rules
```

#### No Changes Required
```
server/src/index.ts               - Compatible as-is
server/src/realtime/*             - Compatible as-is
server/src/game/*                 - Compatible as-is
server/src/lobby/*                - Compatible as-is
```

### Client-Side Code

#### Modified Files
```
client/src/state/lobbyState.ts    - Major refactor
  Changes:
  - SOCKET_IO_PATH: /realtime/socket.io → /socket.io
  - getRealtimeBases(): Uses window.location.host automatically
  - Removed VITE_REALTIME_URL dependency
  - Initial transportMode: 'websocket' → 'socketio'
  - Updated fallback logic (Socket.IO → WebSocket)
  - API calls: /lobby/* → /api/lobby/*
  - Simplified connection strategy
```

#### No Changes Required
```
client/src/components/*           - Compatible as-is
client/src/lobby/*                - Compatible as-is
client/src/game/*                 - Compatible as-is
```

---

## Environment Variables

### Server Environment Variables

#### Changed
```bash
# OLD
REALTIME_WSS_ENABLED=true
REALTIME_SOCKET_IO_ENABLED=true
REALTIME_SOCKET_IO_PATH=/realtime/socket.io

# NEW
REALTIME_SOCKET_IO_ENABLED=true  # Now primary
REALTIME_WSS_ENABLED=true        # Now fallback
SOCKET_IO_PATH=/socket.io        # Standard path
```

#### Deprecated
```bash
# No longer needed (but still accepted for compatibility)
REALTIME_SOCKET_IO_PATH=/realtime/socket.io
```

### Client Environment Variables

#### Removed (No Longer Needed)
```bash
VITE_SITE_ORIGIN=https://www.starvingartistsgame.com
VITE_REALTIME_URL=wss://realtime.starvingartistsgame.com
VITE_REALTIME_SOCKET_IO_PATH=/realtime/socket.io
```

#### Optional (Development Only)
```bash
VITE_API_BASE=http://localhost:4000  # Only for local dev against remote server
```

---

## API Changes

### Endpoint Path Changes

#### REST API
```
OLD: POST /lobby/create
NEW: POST /api/lobby/create

OLD: POST /lobby/:gameId/join
NEW: POST /api/lobby/:gameId/join

OLD: POST /lobby/:gameId/leave
NEW: POST /api/lobby/:gameId/leave

OLD: POST /lobby/:gameId/start
NEW: POST /api/lobby/:gameId/start
```

#### Socket.IO
```
OLD: Path: /realtime/socket.io
     Namespaces: /lobby, /game
     
NEW: Path: /socket.io (standard)
     Namespaces: /lobby, /game (unchanged)
```

#### WebSocket (Fallback)
```
UNCHANGED:
  /realtime/lobby
  /realtime/game
```

### Message Contracts
**No changes** - All message types remain the same:
- `LOBBY_STATE`
- `GAME_STARTED`
- `GAME_STATE_UPDATED`
- `ERROR`
- `GAME_ACTION`

---

## Dependencies

### Added
- None (socket.io was already installed)

### Updated
- None (existing versions compatible)

### Removed
- None

---

## Migration Path

### Automatic (No Code Changes)
If you're using environment variables correctly:
1. Update `server/.env` with new variable names
2. Remove `client/.env` variables (or keep VITE_API_BASE for dev)
3. Update `.htaccess` with new proxy rules
4. Rebuild and restart

### Manual (If Hardcoded)
If you have hardcoded URLs in custom code:
1. Search for `realtime.starvingartistsgame.com` → Remove
2. Search for `/realtime/socket.io` → Change to `/socket.io`
3. Search for `/lobby/` API calls → Change to `/api/lobby/`
4. Rebuild and test

---

## Testing

### Build Status
✅ Server compiles successfully (`npm run server:build`)  
✅ Client compiles successfully (`npm run client:build`)  
✅ No TypeScript errors  
✅ No lint errors  

### Compatibility
✅ Existing tests pass (no test updates needed)  
✅ Message contracts unchanged  
✅ Game logic unchanged  
✅ Database schema unchanged  

### Deployment Targets
✅ Shared hosting (Apache/cPanel) - Primary target  
✅ VPS/Dedicated servers - Still supported  
✅ Local development - Still supported  
✅ Cloud platforms - Still supported  

---

## Performance Impact

### Improvements
- ⚡ Reduced DNS lookups (no subdomain)
- ⚡ Lower latency (same-domain connections)
- ⚡ Better connection success rate (Socket.IO fallback)
- ⚡ Faster initial connection (polling starts immediately)

### Trade-offs
- 🔄 Socket.IO has slightly higher overhead than raw WebSocket
- 🔄 Initial connection may use polling before upgrading to WebSocket
- 🔄 More fallback attempts (better reliability, slightly slower failure detection)

**Net Result**: Better overall reliability and user experience, especially on restrictive networks.

---

## Security

### Unchanged
- ✅ Server remains authoritative
- ✅ All validation on backend
- ✅ CORS protection maintained
- ✅ No new attack vectors introduced

### Improved
- 🔒 Single domain reduces attack surface
- 🔒 Fewer DNS-based attacks possible
- 🔒 Standard Socket.IO path easier to monitor/firewall

---

## Rollback Procedure

If issues arise, rollback is straightforward:

### Quick Rollback
```bash
git revert <this-commit>
npm run server:build
npm run client:build
# Restart application
```

### Partial Rollback (Keep New Docs)
```bash
# Revert code changes but keep documentation improvements
git checkout <previous-commit> -- server/src client/src .htaccess
git checkout <previous-commit> -- server/.env.example client/.env.example
# Keep new docs/
```

---

## Known Issues

### None Currently Identified

If issues are found, they will be documented here.

---

## Future Improvements

### Planned
- [ ] Add WebSocket compression
- [ ] Implement connection quality metrics
- [ ] Add automatic transport selection based on network conditions
- [ ] Create monitoring dashboard for connection health

### Under Consideration
- [ ] Add Redis adapter for Socket.IO (multi-server support)
- [ ] Implement message queuing for offline players
- [ ] Add connection rate limiting

---

## Credits

**Architecture Design**: Based on feedback from shared hosting users  
**Implementation**: January 2025  
**Testing**: Verified on Apache/cPanel shared hosting  
**Documentation**: Comprehensive guides for all user levels  

---

## Support

### For Migration Help
- See: `docs/MIGRATION-SINGLE-DOMAIN.md`
- See: `docs/shared-hosting-deployment.md`

### For Troubleshooting
- See: `docs/QUICK-REFERENCE.md`
- See: `docs/realtime-socket-io.md`

### For Development
- See: `docs/development-plan.md`
- See: `AGENTS.md`

---

**Changelog Version**: 2.0  
**Release Date**: January 2025  
**Status**: ✅ Stable  
**Breaking Changes**: Yes (see migration guide)  
**Backward Compatible**: No (requires environment variable updates)
