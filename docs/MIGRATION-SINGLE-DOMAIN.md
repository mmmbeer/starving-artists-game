# Migration Guide: Subdomain to Single Domain Architecture

This guide helps you migrate from the old subdomain-based realtime architecture (`realtime.starvingartistsgame.com`) to the new single-domain architecture.

## Summary of Changes

### Architecture Changes

| Component | Old | New |
|-----------|-----|-----|
| **Primary Transport** | WebSocket (wss://) | Socket.IO (https://) |
| **Fallback Transport** | Socket.IO | WebSocket |
| **Domain Strategy** | Subdomain required | Single domain |
| **Socket.IO Path** | `/realtime/socket.io` | `/socket.io` |
| **Client Config** | Manual domain config | Auto-detection |
| **Hosting Target** | Dedicated/VPS | Shared hosting friendly |

### Why This Change?

1. **Shared Hosting Compatibility**: Socket.IO works better on restrictive hosting environments
2. **Simplified Setup**: No subdomain DNS or separate SSL certificates needed
3. **Better Fallback**: Socket.IO can use HTTP polling when WebSocket is blocked
4. **Domain Agnostic**: Automatically works with any domain name
5. **Easier Deployment**: Standard cPanel Node.js app setup

## Migration Steps

### Step 1: Update Server Configuration

#### 1.1 Update Environment Variables

**Old (`server/.env`)**:
```bash
REALTIME_WSS_ENABLED=true
REALTIME_SOCKET_IO_ENABLED=true
REALTIME_SOCKET_IO_PATH=/realtime/socket.io
```

**New (`server/.env`)**:
```bash
REALTIME_SOCKET_IO_ENABLED=true  # Socket.IO is now primary
REALTIME_WSS_ENABLED=true        # WebSocket is now fallback
SOCKET_IO_PATH=/socket.io        # Standard path
```

#### 1.2 Update CORS Origins

Remove `realtime.starvingartistsgame.com` from allowed origins:

**Old**:
```bash
ALLOWED_ORIGINS=https://www.starvingartistsgame.com,https://starvingartistsgame.com,https://realtime.starvingartistsgame.com
```

**New**:
```bash
ALLOWED_ORIGINS=https://www.starvingartistsgame.com,https://starvingartistsgame.com
```

### Step 2: Update Client Configuration

#### 2.1 Remove Environment Variables

**Delete** or comment out these from `client/.env`:
```bash
# VITE_SITE_ORIGIN=https://www.starvingartistsgame.com  # Not needed
# VITE_REALTIME_URL=wss://realtime.starvingartistsgame.com  # Not needed
# VITE_REALTIME_SOCKET_IO_PATH=/realtime/socket.io  # Not needed
```

The client now auto-detects the domain!

#### 2.2 Optional: Add Development Override

Only add this if developing locally against a remote server:
```bash
# client/.env (optional, development only)
VITE_API_BASE=http://localhost:4000
```

### Step 3: Update Apache Configuration

#### 3.1 Remove Subdomain Configuration

If you had a separate VirtualHost for `realtime.starvingartistsgame.com`, you can remove it or keep it for backward compatibility.

#### 3.2 Update Main Domain .htaccess

Replace your old proxy rules with the new `.htaccess` file provided in the repository root.

**Key differences**:
- Socket.IO path changed: `/realtime/socket.io` → `/socket.io`
- API prefix added: `/lobby/*` → `/api/lobby/*`
- Simplified proxy rules

### Step 4: Update DNS (Optional)

If you want to completely remove the realtime subdomain:

1. Remove `realtime.starvingartistsgame.com` DNS record (cPanel > Zone Editor)
2. Remove any subdomain in cPanel > Domains > Subdomains
3. Update SSL certificate to no longer include the subdomain (if using wildcard, no action needed)

**Note**: You can keep the subdomain for a transition period if needed.

### Step 5: Rebuild and Redeploy

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Rebuild server
npm run server:build

# Rebuild client
npm run client:build

# Restart application
# Via cPanel: Setup Node.js App → Restart
# Via SSH: pm2 restart starving-artists
```

### Step 6: Test Connections

#### 6.1 Test Health Endpoints

```bash
# Application health
curl https://yourdomain.com/health

# Realtime health
curl https://yourdomain.com/realtime/health
```

#### 6.2 Test Socket.IO

Open browser console on your site:
```javascript
const socket = io('/lobby', {
  path: '/socket.io',
  query: { gameId: 'test-123', playerId: 'player-1' }
});

socket.on('connect', () => console.log('✓ Connected!'));
socket.on('connect_error', (err) => console.error('✗ Error:', err));
```

#### 6.3 Test Complete Flow

1. Create a lobby
2. Join with multiple players
3. Start a game
4. Verify real-time updates work

## Backward Compatibility

The codebase maintains some backward compatibility:

### Server-Side
- Both Socket.IO and WebSocket still work
- Can enable/disable either transport via environment variables
- Message contracts remain the same

### Client-Side
- If old `VITE_REALTIME_URL` is set, client will try it first
- Falls back to current domain automatically
- Old and new clients can't mix - deploy both simultaneously

## Rollback Plan

If you need to rollback to the old architecture:

### Quick Rollback
```bash
# Revert to previous commit
git checkout <previous-commit-hash>

# Or reset to before migration
git reset --hard <commit-before-migration>

# Rebuild and restart
npm run server:build
npm run client:build
# Restart application
```

### Keep Both Running (Transition Period)

1. Keep realtime subdomain DNS active
2. Set `REALTIME_SOCKET_IO_ENABLED=false` temporarily
3. Keep old VirtualHost configuration
4. Don't update `.htaccess` yet
5. Test new architecture on staging domain first

## Troubleshooting Migration

### Issue: "Connection Refused"

**Check**:
1. Node.js application is running
2. `.htaccess` file is in correct location
3. Apache has proxy modules enabled

**Fix**:
```bash
# Verify Node.js is running
curl http://localhost:4000/health

# Check Apache modules
apachectl -M | grep proxy
```

### Issue: "CORS Error"

**Check**:
1. `ALLOWED_ORIGINS` includes your domain (both www and non-www)
2. No typos in domain names
3. Protocol matches (http vs https)

**Fix**:
```bash
# Update server/.env
ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com

# Restart application
```

### Issue: "Socket.IO Not Connecting"

**Check**:
1. `/socket.io` path is being proxied correctly
2. Check browser Network tab for `/socket.io/?EIO=4&transport=polling`
3. Should see successful connection

**Fix**:
```bash
# Test Socket.IO endpoint directly
curl http://localhost:4000/socket.io/

# Should return Socket.IO handshake data
```

### Issue: "Old Realtime Subdomain Still Referenced"

**Check**:
1. Clear browser cache and hard reload (Ctrl+Shift+R)
2. Client was rebuilt after removing env vars
3. No hardcoded URLs in custom code

**Fix**:
```bash
# Rebuild client with no cache
rm -rf client/dist client/node_modules/.vite
npm run client:build
```

## Performance Comparison

### Old Architecture (Subdomain + WebSocket Primary)

- Extra DNS lookup for subdomain
- WebSocket often blocked on shared hosting
- Requires mod_proxy_wstunnel
- More complex Apache configuration

### New Architecture (Single Domain + Socket.IO Primary)

- No extra DNS lookup
- Socket.IO polling fallback always works
- Works without mod_proxy_wstunnel
- Simpler Apache configuration
- Better reconnection handling

## Testing Checklist

- [ ] Server health endpoint responds (`/health`)
- [ ] Realtime health endpoint responds (`/realtime/health`)
- [ ] Socket.IO connects from browser
- [ ] Can create a lobby
- [ ] Can join a lobby
- [ ] Can see other players join in real-time
- [ ] Can start a game
- [ ] Game actions sync in real-time
- [ ] Works on mobile browsers
- [ ] Works on different networks (WiFi, mobile data)
- [ ] Reconnection works after network interruption

## Support

If you encounter issues during migration:

1. **Check Documentation**:
   - [Shared Hosting Deployment](shared-hosting-deployment.md)
   - [Real-time Architecture](realtime-socket-io.md)

2. **Enable Debug Logging**:
   ```javascript
   // Client-side: Enable Socket.IO debug logs
   localStorage.debug = 'socket.io-client:*';
   ```

3. **Check Server Logs**:
   ```bash
   # Via cPanel Terminal or SSH
   tail -f ~/starving-artists/logs/error.log
   ```

4. **Review Apache Logs**:
   ```bash
   tail -f /var/log/apache2/error_log
   ```

## Timeline Recommendation

- **Week 1**: Deploy to staging/test environment
- **Week 2**: Test with real users on staging
- **Week 3**: Deploy to production during low-traffic period
- **Week 4**: Monitor and iterate

## Conclusion

The new single-domain architecture simplifies deployment and improves compatibility with shared hosting environments. The migration is straightforward and can be rolled back if needed.

**Benefits**:
- ✓ Easier to deploy
- ✓ Works on more hosting providers
- ✓ Simpler configuration
- ✓ Better fallback handling
- ✓ Lower latency (no subdomain lookup)

---

**Migration Document Version**: 1.0  
**Last Updated**: January 2025  
**Compatible With**: Architecture v2.0 (Single Domain)
