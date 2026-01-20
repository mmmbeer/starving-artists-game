# Shared Hosting Deployment Guide for Starving Artists Online

This guide provides step-by-step instructions for deploying Starving Artists Online on traditional shared hosting (Apache/cPanel) with a single domain.

## Overview

The application has been redesigned to run entirely from your primary domain (e.g., `www.starvingartistsgame.com` or `starvingartistsgame.com`) without requiring a separate realtime subdomain. The architecture uses:

- **Socket.IO as primary** realtime transport (better compatibility with shared hosting)
- **WebSocket as fallback** (if available and Socket.IO fails)
- **Domain-agnostic design** - works with any domain name
- **Apache reverse proxy** via .htaccess for routing

## Architecture

```
Client Browser
    ↓
Apache Web Server (Port 80/443)
    ↓ .htaccess proxy rules
Node.js Backend (Port 4000)
    ├── REST API (/api/lobby/*)
    ├── Socket.IO (/socket.io/*)
    ├── WebSocket Lobby (/realtime/lobby)
    └── WebSocket Game (/realtime/game)
```

## Prerequisites

1. **Shared Hosting Requirements:**
   - cPanel with Node.js support
   - Apache with mod_proxy, mod_proxy_http, mod_proxy_wstunnel
   - .htaccess file control
   - SSH access (recommended but not required)

2. **Database:**
   - MySQL database (create via cPanel > MySQL Databases)
   - Note the database name, username, password, and host

3. **Domain:**
   - Domain pointed to your shared hosting
   - SSL certificate installed (Let's Encrypt via cPanel is fine)

## Step 1: Setup Node.js Application in cPanel

### 1.1 Create Node.js Application

1. Log into cPanel
2. Navigate to **Software > Setup Node.js App**
3. Click **Create Application**
4. Configure:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: `/path/to/your/app` (e.g., `/home/username/starving-artists`)
   - **Application URL**: Your domain (e.g., `starvingartistsgame.com`)
   - **Application startup file**: `server/dist/server/src/index.js`
   - **Environment variables**: Add these (see Step 1.2)

### 1.2 Configure Environment Variables

In the cPanel Node.js App interface, add these environment variables:

```bash
# Server Configuration
PORT=4000

# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=3306

# Realtime Configuration
REALTIME_SOCKET_IO_ENABLED=true
REALTIME_WSS_ENABLED=true
SOCKET_IO_PATH=/socket.io

# CORS Origins (add your domain)
ALLOWED_ORIGINS=https://www.starvingartistsgame.com,https://starvingartistsgame.com
```

**Important**: Replace `your_db_*` values with your actual database credentials from cPanel > MySQL Databases.

## Step 2: Upload Application Files

### 2.1 Via FTP/File Manager

1. Upload entire project to your application root
2. Ensure these directories exist:
   - `/server/`
   - `/client/`
   - `/shared/`
   - `/docs/`

### 2.2 Via SSH (Preferred)

```bash
# SSH into your server
ssh username@your-server.com

# Navigate to application directory
cd ~/starving-artists

# Clone repository (if using Git)
git clone https://github.com/yourusername/starving-artists-game.git .

# Or upload via rsync/scp
```

## Step 3: Build the Application

### 3.1 Via SSH

```bash
# Install dependencies
npm install

# Build server
npm run server:build

# Build client
npm run client:build
```

### 3.2 Via cPanel Terminal (if SSH unavailable)

1. Go to cPanel > **Terminal**
2. Navigate to your app directory: `cd ~/starving-artists`
3. Run the same build commands as above

## Step 4: Initialize Database

### 4.1 Create Database Schema

1. Go to cPanel > **phpMyAdmin**
2. Select your database
3. Click **Import**
4. Upload and execute `/sql/init-schema.sql`

This creates all necessary tables:
- `users`
- `games`
- `game_players`
- `game_snapshots`
- `canvases`

## Step 5: Configure Apache Reverse Proxy

### 5.1 Copy .htaccess File

Copy the provided `.htaccess` file to your public_html directory (or wherever your domain root is):

```bash
# If in application directory
cp .htaccess /home/username/public_html/.htaccess
```

### 5.2 Verify .htaccess Contents

The `.htaccess` file should contain proxy rules for:
- `/socket.io/*` → Socket.IO transport
- `/api/lobby/*` → REST API endpoints
- `/realtime/lobby` → WebSocket lobby (fallback)
- `/realtime/game` → WebSocket game (fallback)
- `/realtime/health` → Health check endpoint

### 5.3 Test Apache Modules

Ensure required modules are enabled. Contact your hosting provider if these are missing:

```bash
# Via SSH, check Apache modules
apachectl -M | grep proxy

# Should see:
# proxy_module
# proxy_http_module
# proxy_wstunnel_module (for WebSocket fallback)
```

## Step 6: Start the Application

### 6.1 Via cPanel Node.js App

1. Go to cPanel > **Setup Node.js App**
2. Find your application
3. Click **Run NPM Install** (if not done)
4. Click **Start Application**
5. Status should show "Running"

### 6.2 Via SSH (Alternative)

```bash
# Navigate to app directory
cd ~/starving-artists

# Start in production mode
npm run server:start

# Or use PM2 (if available)
pm2 start server/dist/server/src/index.js --name starving-artists
pm2 save
pm2 startup
```

## Step 7: Verify Deployment

### 7.1 Check Application Health

Open in browser:
```
https://yourdomain.com/health
```

Should return:
```json
{"status": "ok"}
```

### 7.2 Check Realtime Health

```
https://yourdomain.com/realtime/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T...",
  "lobby": {
    "activeGames": 0,
    "activeConnections": 0,
    "lastBroadcastAt": null
  },
  "game": {
    "activeGames": 0,
    "activeConnections": 0,
    "lastBroadcastAt": null
  }
}
```

### 7.3 Test Socket.IO Connection

Open browser console and test:

```javascript
// Test Socket.IO connection
const socket = io('/lobby', {
  path: '/socket.io',
  query: { gameId: 'test-123', playerId: 'player-1' }
});

socket.on('connect', () => console.log('Socket.IO connected!'));
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

## Step 8: Access Your Application

Navigate to your domain:
```
https://yourdomain.com
```

The React SPA should load, and you should be able to:
1. Create a lobby
2. Join games
3. See realtime updates

## Troubleshooting

### Issue: "500 Internal Server Error"

**Cause**: Node.js application not running or crashed

**Solution**:
1. Check cPanel > Setup Node.js App → restart application
2. Check error logs: `tail -f ~/starving-artists/logs/error.log`
3. Verify environment variables are set correctly

### Issue: "Connection to Socket.IO failed"

**Cause**: Apache not proxying Socket.IO correctly

**Solution**:
1. Verify `.htaccess` is in correct location (public_html)
2. Check Apache error log: `tail -f /var/log/apache2/error_log`
3. Ensure mod_proxy modules are enabled
4. Verify Node.js app is listening on port 4000

### Issue: "CORS error" in browser console

**Cause**: ALLOWED_ORIGINS doesn't include your domain

**Solution**:
1. Add your domain to ALLOWED_ORIGINS environment variable
2. Include both www and non-www versions
3. Restart Node.js application

### Issue: WebSocket connection fails (101 Upgrade fails)

**Cause**: mod_proxy_wstunnel not enabled or Apache not forwarding upgrade headers

**Solution**:
1. Contact hosting provider to enable mod_proxy_wstunnel
2. Socket.IO should still work via polling transport
3. Check `.htaccess` WebSocket proxy rules

### Issue: Application works locally but not on server

**Cause**: Environment variables or paths incorrect

**Solution**:
1. Verify all environment variables in cPanel
2. Check file paths are absolute in production
3. Ensure database is accessible from Node.js
4. Check that `client/dist` directory exists and contains built files

## Monitoring & Maintenance

### Check Application Status

```bash
# Via cPanel
# Go to: Setup Node.js App → Check status

# Via SSH/Terminal
curl http://localhost:4000/health
curl http://localhost:4000/realtime/health
```

### View Logs

```bash
# Application logs (if using PM2)
pm2 logs starving-artists

# Apache error logs
tail -f /var/log/apache2/error_log

# Node.js app logs (via cPanel)
# Setup Node.js App → Open terminal → view log files
```

### Restart Application

```bash
# Via cPanel
# Setup Node.js App → Restart Application

# Via SSH (if using PM2)
pm2 restart starving-artists
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run server:build
npm run client:build

# Restart
# Via cPanel or PM2 restart
```

## Performance Optimization

### Enable Compression

Add to `.htaccess`:
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>
```

### Enable Browser Caching

Add to `.htaccess`:
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Monitor Resource Usage

- Check cPanel > **Resource Usage** for CPU/Memory limits
- If hitting limits, consider:
  - Upgrading hosting plan
  - Optimizing database queries
  - Implementing Redis caching (if available)

## Security Best Practices

1. **Keep dependencies updated**:
   ```bash
   npm audit fix
   npm update
   ```

2. **Use environment variables** for all sensitive data (never commit credentials)

3. **Enable HTTPS** (Let's Encrypt via cPanel is free)

4. **Restrict database access** to localhost only

5. **Set appropriate file permissions**:
   ```bash
   chmod 644 .htaccess
   chmod 600 server/.env
   ```

6. **Regular backups** (use cPanel backup feature)

## Support

For issues specific to:
- **Shared hosting setup**: Contact your hosting provider
- **Application bugs**: Check GitHub issues or documentation
- **Database problems**: Verify credentials and connectivity

## Additional Resources

- [cPanel Node.js Documentation](https://docs.cpanel.net/cpanel/software/setup-nodejs-app/)
- [Apache mod_proxy Guide](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Project Development Plan](/docs/development-plan.md)

---

**Last Updated**: January 2025
**Version**: 1.0 (Single Domain Architecture)
