# Starving Artists - Complete Deployment Guide for Shared Hosting (cPanel)

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [File Upload & Installation](#file-upload--installation)
5. [Node.js Application Setup](#nodejs-application-setup)
6. [Testing Your Deployment](#testing-your-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### What You Need:
- ✅ Shared hosting account with cPanel access
- ✅ Node.js support (version 18.x or higher)
- ✅ MySQL database support
- ✅ SSH access (recommended but not required)
- ✅ FTP/SFTP access or File Manager
- ✅ Your domain pointed to the hosting server

### Verify Your Hosting Supports:
1. **Node.js**: Check cPanel for "Setup Node.js App" or "Node.js Selector"
2. **MySQL**: Version 5.7 or higher
3. **Memory**: At least 512MB RAM recommended
4. **Storage**: At least 500MB free space

---

## Database Setup

### Step 1: Create MySQL Database

1. **Log into cPanel**
2. **Navigate to**: Databases → MySQL Databases
3. **Create Database:**
   - Database Name: `starving_artists` (or your choice)
   - Click "Create Database"
   - **Note down the full database name** (usually prefixed like `username_starving_artists`)

4. **Create Database User:**
   - Username: `starving_admin` (or your choice)
   - Password: Generate a strong password
   - Click "Create User"
   - **Save these credentials** - you'll need them!

5. **Add User to Database:**
   - Select the user you just created
   - Select the database you created
   - Click "Add"
   - Grant **ALL PRIVILEGES**
   - Click "Make Changes"

### Step 2: Import Database Schema

1. **Navigate to**: cPanel → phpMyAdmin
2. **Select your database** from the left sidebar
3. **Click the "Import" tab**
4. **Choose File**: Upload `/sql/schema.sql` from your project
5. **Click "Go"** to import
6. **Verify**: You should see these tables:
   - games
   - players
   - game_state
   - player_canvases
   - player_paint_cubes
   - canvas_definitions

### Step 3: Verify Database Connection

In cPanel → phpMyAdmin:
- Click your database
- Click on `canvas_definitions` table
- You should see 4 sample canvas cards with data

**✅ Database Setup Complete!**

---

## Environment Configuration

### Step 1: Get Your Database Details

You need these from the database setup:
- **DB_HOST**: Usually `localhost` (check with hosting provider if unsure)
- **DB_USER**: Your database username (e.g., `username_starving_admin`)
- **DB_PASSWORD**: The password you created
- **DB_NAME**: Your database name (e.g., `username_starving_artists`)
- **DB_PORT**: Usually `3306`

### Step 2: Create .env File

1. Navigate to `/server/` directory in your project
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` file with your actual values:

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Session Secret - CHANGE THIS!
SESSION_SECRET=your-super-secret-key-change-this-now-make-it-long-and-random

# Database Configuration
DB_HOST=localhost
DB_USER=username_starving_admin
DB_PASSWORD=your_strong_password_here
DB_NAME=username_starving_artists
DB_PORT=3306
```

### Step 3: Generate Session Secret

**Important**: Never use the default session secret in production!

Generate a strong random secret:
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 64

# Option 3: Use an online generator
# Visit: https://randomkeygen.com/
```

Copy the generated string and paste it as your `SESSION_SECRET`.

**✅ Environment Configuration Complete!**

---

## File Upload & Installation

### Option A: Using FTP/SFTP (Easier)

1. **Connect to your server via FTP:**
   - Host: Your domain or server IP
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21 (FTP) or 22 (SFTP)

2. **Upload project files:**
   - Navigate to your home directory (e.g., `/home/username/`)
   - Create folder: `starving-artists/`
   - Upload ALL project files to this folder
   - Include: `server/`, `sql/`, `docs/`, `package.json`, etc.

3. **Verify uploaded files:**
   ```
   /home/username/starving-artists/
   ├── server/
   │   ├── src/
   │   ├── views/
   │   ├── public/
   │   ├── package.json
   │   └── .env (your configured file)
   ├── sql/
   ├── docs/
   └── package.json
   ```

### Option B: Using SSH (Advanced)

1. **SSH into your server:**
   ```bash
   ssh username@yourdomain.com
   ```

2. **Navigate to home directory:**
   ```bash
   cd ~
   ```

3. **Upload via Git (if repository is on GitHub):**
   ```bash
   git clone https://github.com/yourusername/starving-artists-game.git starving-artists
   cd starving-artists
   ```

4. **Create .env file:**
   ```bash
   cd server
   cp .env.example .env
   nano .env  # Edit with your database credentials
   ```

### Step 4: Verify File Permissions

Ensure proper permissions (via SSH or cPanel File Manager):
```bash
chmod 644 server/.env
chmod 755 server/public
chmod 755 server/views
```

**✅ Files Uploaded!**

---

## Node.js Application Setup

### Step 1: Access Node.js App Manager

1. **Log into cPanel**
2. **Navigate to**: Software → Setup Node.js App (or "Node.js Selector")
3. **Click**: "Create Application"

### Step 2: Configure Application

Fill in these details:

**Basic Settings:**
- **Node.js version**: Select 18.x or higher (latest LTS recommended)
- **Application mode**: Production
- **Application root**: `/home/username/starving-artists/server`
- **Application URL**: Your domain (e.g., `yourdomain.com`)
- **Application startup file**: `dist/index.js`

**Important Notes:**
- ⚠️ The path must be **absolute**: `/home/username/starving-artists/server`
- ⚠️ Replace `username` with your actual cPanel username
- ⚠️ The startup file is in the `dist/` folder after building

**Click "Create"**

### Step 3: Set Environment Variables

In the Node.js App interface, scroll to "Environment variables":

Add these **one by one**:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `PORT` | `4000` | `4000` |
| `NODE_ENV` | `production` | `production` |
| `SESSION_SECRET` | Your generated secret | `abc123...` |
| `DB_HOST` | `localhost` | `localhost` |
| `DB_USER` | Your DB username | `user_starving_admin` |
| `DB_PASSWORD` | Your DB password | `MyStr0ng_P@ssw0rd` |
| `DB_NAME` | Your DB name | `user_starving_artists` |
| `DB_PORT` | `3306` | `3306` |

**Click "Save"** after adding each variable.

### Step 4: Install Dependencies & Build

In the Node.js App interface:

1. **Click**: "Run NPM Install"
   - This installs all dependencies from `package.json`
   - Wait for completion (may take 2-3 minutes)

2. **Open Terminal** (in cPanel or via SSH):
   ```bash
   cd /home/username/starving-artists/server
   npm run build
   ```
   
   This compiles TypeScript to JavaScript in the `dist/` folder.

3. **Verify build succeeded:**
   ```bash
   ls -la dist/
   # You should see index.js and other compiled files
   ```

### Step 5: Start Application

Back in the Node.js App interface:

1. **Click**: "Start Application"
2. **Status should change to**: "Running"
3. **Note the port**: Usually shows something like `http://127.0.0.1:4000`

If it fails to start, check logs:
```bash
# Via SSH
tail -f /home/username/starving-artists/server/logs/error.log

# Or check cPanel Node.js App → Open Terminal → View logs
```

### Step 6: Configure .htaccess for Proxy

Your application runs on port 4000 internally but needs to be accessible via your domain.

1. **Navigate to**: `/home/username/public_html/`
2. **Create/Edit**: `.htaccess` file
3. **Add these rules:**

```apache
# Starving Artists Game - Proxy Configuration

# Enable rewrite engine
RewriteEngine On

# Proxy all requests to Node.js app on port 4000
RewriteCond %{REQUEST_URI} !^/cgi-bin/
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]

# Preserve host header
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Port "443"

# Enable proxy
<IfModule mod_proxy.c>
  ProxyPreserveHost On
  ProxyPass / http://127.0.0.1:4000/ retry=0
  ProxyPassReverse / http://127.0.0.1:4000/
</IfModule>

# WebSocket support (if available)
<IfModule mod_proxy_wstunnel.c>
  RewriteCond %{HTTP:Upgrade} =websocket [NC]
  RewriteRule /(.*)$ ws://127.0.0.1:4000/$1 [P,L]
</IfModule>
```

4. **Save the file**

### Alternative: Using Passenger (if available)

If your hosting uses Passenger:

1. Create `passenger_wsgi.py` or `config.ru` (check hosting documentation)
2. Or use "Setup Python App" / "Setup Node.js App" interface

**✅ Node.js Application Running!**

---

## Testing Your Deployment

### Step 1: Check Application Health

Open your browser and navigate to:
```
https://yourdomain.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T12:34:56.789Z"
}
```

If you see this, your app is running! 🎉

### Step 2: Check Database Connection

Navigate to:
```
https://yourdomain.com
```

You should see the landing page with:
- "Create Game" button
- "Join Game" input field
- Game title and design

### Step 3: Test Complete Flow

1. **Create a game:**
   - Click "Create Game"
   - Enter your name
   - You should be redirected to a lobby page

2. **Copy the game URL**

3. **Open in another browser/incognito:**
   - Paste the lobby URL
   - Join the game with a different name
   - You should see both players in the lobby

4. **Start the game:**
   - As the host, click "Start Game"
   - All players should be redirected to the game board

5. **Test actions:**
   - Click "Work" to draw paint cubes
   - Try buying a canvas
   - Test the paint functionality

### Step 4: Check Socket.IO Connection

Open browser console (F12 → Console):

You should see:
- Socket.IO connection established
- No connection errors
- Real-time updates when other players act

**✅ Deployment Successful!**

---

## Troubleshooting

### Issue 1: "500 Internal Server Error"

**Possible Causes:**
1. Node.js app not running
2. Wrong startup file path
3. Missing dependencies
4. Database connection failed

**Solutions:**

**A. Check if app is running:**
```bash
# Via cPanel Node.js App
# Status should be "Running"

# Via SSH
ps aux | grep node
# Should show your Node.js process
```

**B. Check error logs:**
```bash
cd /home/username/starving-artists/server
tail -50 logs/error.log

# Or check cPanel Node.js App → Logs
```

**C. Verify startup file:**
```bash
ls -la /home/username/starving-artists/server/dist/index.js
# File should exist
```

**D. Restart application:**
- cPanel → Node.js App → Restart Application
- Or via SSH: `npm run build && pm2 restart starving-artists`

### Issue 2: "Database Connection Failed"

**Check:**
1. Database credentials in .env file
2. Database user has permissions
3. Database exists and has tables

**Test database connection:**
```bash
# Via SSH
mysql -h localhost -u your_db_user -p
# Enter password
USE your_db_name;
SHOW TABLES;
# Should list 6 tables
```

**Verify environment variables:**
```bash
# In cPanel Node.js App
# Check that all DB_* variables are set correctly
```

### Issue 3: "Page Not Loading" / "Site Can't Be Reached"

**Check:**
1. .htaccess file is in `/public_html/`
2. Port 4000 is correct in proxy rules
3. Apache mod_proxy is enabled (contact host if not)

**Test direct access:**
```
http://yourdomain.com:4000/health
```

If this works but proxied version doesn't, issue is with .htaccess/Apache config.

### Issue 4: "Socket.IO Not Connecting"

**Symptoms:**
- Page loads but real-time updates don't work
- Console shows "Socket.IO connection failed"

**Solutions:**

**A. Check WebSocket support:**
Some shared hosts block WebSocket. Socket.IO should fall back to polling automatically.

**B. Verify proxy configuration:**
Ensure .htaccess has WebSocket proxy rules (see Step 6 above)

**C. Test Socket.IO endpoint:**
```
https://yourdomain.com/socket.io/?EIO=4&transport=polling
```
Should return Socket.IO handshake data.

### Issue 5: "Cannot Find Module" Errors

**Solution:**
```bash
cd /home/username/starving-artists/server
rm -rf node_modules
npm install
npm run build
# Restart app
```

### Issue 6: "Session Lost on Refresh"

**Check:**
1. SESSION_SECRET is set in environment variables
2. NODE_ENV=production
3. Cookies are enabled in browser

**Verify:**
```bash
# Check environment variables are loaded
# In Node.js app logs, you should see them at startup
```

### Issue 7: High Memory Usage / App Crashes

**Solutions:**

**A. Check memory limits:**
```bash
# Via SSH
free -h
# Check available memory
```

**B. Optimize queries:**
- Ensure database has proper indexes
- Check for memory leaks in logs

**C. Contact hosting provider:**
- May need to upgrade plan if hitting limits

### Getting Help

**Check logs first:**
```bash
# Application logs
tail -100 /home/username/starving-artists/server/logs/error.log

# Apache logs
tail -100 /var/log/apache2/error_log
# (path may vary by host)

# Node.js app logs
# cPanel → Node.js App → Open Terminal → View logs
```

**Common log locations:**
- `/home/username/logs/`
- `/var/log/apache2/`
- cPanel Error Log viewer

---

## Maintenance & Updates

### Deploying Updates

**Via FTP:**
1. Upload changed files
2. SSH or cPanel Terminal:
   ```bash
   cd /home/username/starving-artists/server
   npm run build
   ```
3. Restart app via cPanel

**Via Git (SSH):**
```bash
cd /home/username/starving-artists
git pull origin main
cd server
npm install  # If dependencies changed
npm run build
# Restart via cPanel or: pm2 restart starving-artists
```

### Database Backups

**Regular backups (recommended: daily):**

**Via cPanel:**
1. cPanel → Backup → Download Database Backup
2. Store safely offsite

**Via SSH:**
```bash
mysqldump -u your_db_user -p your_db_name > backup_$(date +%Y%m%d).sql
```

**Automate with cron:**
```bash
# cPanel → Cron Jobs
# Schedule: Daily at 2 AM
0 2 * * * mysqldump -u user -ppassword dbname > /home/username/backups/db_$(date +\%Y\%m\%d).sql
```

### Monitor Application

**Set up monitoring:**

1. **Uptime monitoring:**
   - Use services like UptimeRobot (free)
   - Monitor: `https://yourdomain.com/health`
   - Get alerts if app goes down

2. **Check logs regularly:**
   ```bash
   # Via SSH or cPanel Terminal
   tail -f /home/username/starving-artists/server/logs/error.log
   ```

3. **Database size:**
   - Check periodically in phpMyAdmin
   - Clean up old finished games if needed

### Performance Optimization

**1. Enable compression** (if not already):
Add to .htaccess:
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>
```

**2. Enable caching:**
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

**3. Optimize database:**
```sql
-- Via phpMyAdmin, run periodically
OPTIMIZE TABLE games;
OPTIMIZE TABLE players;
OPTIMIZE TABLE player_canvases;
```

### Security Best Practices

1. **Keep Node.js updated:**
   - Check cPanel for updates
   - Update via Node.js App interface

2. **Update dependencies:**
   ```bash
   cd server
   npm update
   npm audit fix
   npm run build
   # Restart app
   ```

3. **Secure .env file:**
   ```bash
   chmod 600 /home/username/starving-artists/server/.env
   ```

4. **Regular backups:**
   - Database: Daily
   - Application files: Weekly
   - Store offsite (Google Drive, Dropbox, etc.)

5. **SSL Certificate:**
   - Use Let's Encrypt (free in cPanel)
   - Auto-renewal should be enabled

---

## Quick Reference

### Important Paths

```
Application root:   /home/username/starving-artists/
Server directory:   /home/username/starving-artists/server/
Public HTML:        /home/username/public_html/
Logs:               /home/username/starving-artists/server/logs/
.env file:          /home/username/starving-artists/server/.env
.htaccess:          /home/username/public_html/.htaccess
```

### Important URLs

```
Homepage:           https://yourdomain.com/
Health Check:       https://yourdomain.com/health
Lobby (example):    https://yourdomain.com/lobby/abc-123-def-456
Game (example):     https://yourdomain.com/game/abc-123-def-456
Socket.IO Test:     https://yourdomain.com/socket.io/?EIO=4&transport=polling
```

### Common Commands

```bash
# Rebuild application
cd /home/username/starving-artists/server
npm run build

# Restart application
# Via cPanel: Node.js App → Restart

# Check running processes
ps aux | grep node

# View logs
tail -50 logs/error.log

# Database backup
mysqldump -u user -p database > backup.sql

# Check disk space
df -h

# Check memory usage
free -h
```

### Environment Variables Quick Reference

```env
PORT=4000
NODE_ENV=production
SESSION_SECRET=your-64-character-random-string-here
DB_HOST=localhost
DB_USER=username_starving_admin
DB_PASSWORD=your_secure_password
DB_NAME=username_starving_artists
DB_PORT=3306
```

---

## Support Resources

### Documentation
- Full documentation: `/docs/` directory in project
- Development plan: `/docs/development-plan.md`
- API documentation: `/docs/API.md`

### Hosting Support
- Contact your hosting provider for:
  - Node.js version updates
  - Apache module activation
  - Memory/CPU limit increases
  - SSL certificate issues

### Application Issues
- Check logs first
- Review troubleshooting section
- Verify all environment variables
- Test database connection

---

## Success Checklist

Before going live, verify:

- [ ] Database created and schema imported
- [ ] All tables exist with sample data
- [ ] .env file configured with correct credentials
- [ ] Session secret is strong and unique
- [ ] Node.js app running in cPanel
- [ ] All environment variables set in cPanel
- [ ] Application built (`npm run build` successful)
- [ ] .htaccess configured and in place
- [ ] Health endpoint returns OK
- [ ] Landing page loads correctly
- [ ] Can create and join lobbies
- [ ] Can start games
- [ ] Real-time updates working
- [ ] All game actions functional
- [ ] SSL certificate installed and working
- [ ] Backups configured
- [ ] Monitoring set up

---

**Congratulations! Your Starving Artists game is now deployed and ready to play! 🎨🎉**

For questions or issues not covered here, check the `/docs/` directory or review the application logs for specific error messages.

Last Updated: January 2025
Version: 2.0
