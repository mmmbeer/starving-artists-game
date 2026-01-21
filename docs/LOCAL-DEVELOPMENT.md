# Local Development Setup Guide

Quick guide to get Starving Artists running on your local machine for development.

## Prerequisites

- Node.js 18.x or higher
- MySQL 5.7 or higher
- npm or yarn
- Git (optional)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# From project root
npm install

# This installs dependencies for the server workspace
```

### 2. Setup Database

**Create Database:**
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE starving_artists;

# Create user (optional but recommended)
CREATE USER 'starving_admin'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON starving_artists.* TO 'starving_admin'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
exit;
```

**Import Schema:**
```bash
mysql -u root -p starving_artists < sql/schema.sql

# Or with your created user
mysql -u starving_admin -p starving_artists < sql/schema.sql
```

### 3. Configure Environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=4000
NODE_ENV=development

SESSION_SECRET=local-dev-secret-not-for-production

DB_HOST=localhost
DB_USER=starving_admin
DB_PASSWORD=dev_password
DB_NAME=starving_artists
DB_PORT=3306
```

### 4. Build and Run

```bash
# From project root

# Build the server
npm run build

# Start in development mode (with auto-reload)
npm run dev

# Or start in production mode
npm run start
```

### 5. Access the Application

Open your browser:
```
http://localhost:4000
```

**Test health endpoint:**
```
http://localhost:4000/health
```

Should return:
```json
{"status": "ok", "timestamp": "..."}
```

## Development Workflow

### Making Changes

**Backend changes:**
```bash
# TypeScript files auto-compile with ts-node-dev
npm run dev

# Or manually rebuild
npm run build
```

**Frontend changes:**
- Edit EJS templates in `server/views/`
- Edit CSS in `server/public/css/`
- Edit client JS in `server/public/js/`
- Changes are immediately visible (refresh browser)

### Database Changes

**Add new migration:**
```bash
# Edit sql/schema.sql with your changes

# Re-import
mysql -u starving_admin -p starving_artists < sql/schema.sql
```

**Reset database:**
```bash
mysql -u starving_admin -p -e "DROP DATABASE starving_artists; CREATE DATABASE starving_artists;"
mysql -u starving_admin -p starving_artists < sql/schema.sql
```

### Testing

**Test game flow:**
1. Create game at http://localhost:4000
2. Open incognito window
3. Join game with lobby URL
4. Start game and test actions

**Test with multiple players:**
- Use multiple browser windows/incognito sessions
- Each can join the same lobby

## Common Issues

### "Cannot connect to database"

Check MySQL is running:
```bash
# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
# Start MySQL service from Services panel
```

### "Port 4000 already in use"

Kill existing process:
```bash
# Find process
lsof -i :4000

# Kill it
kill -9 <PID>

# Or change PORT in .env
```

### "Module not found"

Reinstall dependencies:
```bash
rm -rf node_modules server/node_modules
npm install
```

## Project Structure

```
/app
├── server/               # Backend application
│   ├── src/             # TypeScript source
│   ├── dist/            # Compiled JavaScript (generated)
│   ├── views/           # EJS templates
│   ├── public/          # Static assets (CSS, JS, images)
│   └── package.json
├── sql/                 # Database schemas
├── docs/                # Documentation
└── package.json         # Root package (workspace)
```

## Useful Commands

```bash
# Development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Production mode
npm run start

# Check logs
tail -f server/logs/*.log

# Database shell
mysql -u starving_admin -p starving_artists
```

## Next Steps

- Read `/docs/REFACTORING-PLAN.md` for architecture
- Check `/docs/development-plan.md` for feature roadmap
- Review `/docs/DEPLOYMENT-GUIDE.md` for production deployment

---

Happy Coding! 🎨
