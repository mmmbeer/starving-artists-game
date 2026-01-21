
## Contributing

This project follows the guidelines in [AGENTS.md](AGENTS.md). Key principles:

- **Server is authoritative** for all game state
- **Deterministic behavior** - identical inputs produce identical results
- **No partial deliverables** - all code must be production-ready
- **Explicit state transitions** - no hidden mutations
- **Zero regression policy** - existing tests must pass

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/starving-artists-game/issues)
- **Documentation**: See [docs/](docs/) directory
- **Game Rules**: [docs/game-rules.md](docs/game-rules.md)

## License

[Your License Here]

## Acknowledgments

Based on the Starving Artists board game © 2016 Fairway 3 Games, LLC

---

**Current Status**: Phase 3 Complete (Turn System + Real-time Sync)  
**Next Phase**: Phase 4 - Drag-and-Drop Painting Engine  
**Architecture Version**: 2.0 (Single Domain with Socket.IO Primary)

# Starving Artists Online 🎨

A feature-complete, multiplayer online implementation of the Starving Artists board game. Built with modern web technologies and optimized for both local development and shared hosting deployment.

## 🎮 About the Game

Starving Artists is a competitive board game where players take on the role of artists trying to survive while creating and selling paintings. Players must balance:
- **Nutrition**: Stay fed or face elimination
- **Paint Collection**: Gather paint cubes to create artwork
- **Canvas Painting**: Complete paintings by matching colors
- **Selling Strategy**: Sell at the right time for maximum rewards
- **Victory**: First to complete the target number of paintings or reach the point threshold wins!

## ✨ Features

### Complete Game Implementation
- ✅ **Full Game Rules**: All mechanics from the physical board game
- ✅ **2-4 Players**: Supports the full player range
- ✅ **Turn-Based Gameplay**: Morning, Day, Night phases with actions
- ✅ **Selling Phase**: Round-robin canvas selling with payouts
- ✅ **Win Conditions**: Multiple victory paths
- ✅ **Starvation System**: Nutrition management and game-end scenarios

### Modern Web Application
- ✅ **Real-Time Multiplayer**: Socket.IO for instant updates
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Modern UI**: Bootstrap 5 with custom art gallery theme
- ✅ **Session Management**: Persistent player sessions
- ✅ **Clean Architecture**: Service-oriented backend design

### Technical Excellence
- ✅ **TypeScript Backend**: Full type safety
- ✅ **EJS Templates**: Server-side rendering
- ✅ **MySQL Database**: Reliable persistence
- ✅ **Vanilla JavaScript**: No heavy frontend frameworks
- ✅ **Single Responsibility**: Every file under 500 lines
- ✅ **Production Ready**: Optimized for shared hosting

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- MySQL 5.7 or higher
- npm or yarn

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/starving-artists-game.git
cd starving-artists-game

# 2. Install dependencies
npm install

# 3. Setup database
mysql -u root -p < sql/schema.sql

# 4. Configure environment
cd server
cp .env.example .env
# Edit .env with your database credentials

# 5. Build and run
cd ..
npm run build
npm run dev

# 6. Open browser
# Navigate to: http://localhost:4000
```

**Detailed local setup**: See [docs/LOCAL-DEVELOPMENT.md](docs/LOCAL-DEVELOPMENT.md)

### Production Deployment

For deployment to shared hosting (cPanel):

**Complete step-by-step guide**: See [docs/DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md)

Quick overview:
1. Create MySQL database in cPanel
2. Import `sql/schema.sql`
3. Configure environment variables
4. Upload files via FTP/SSH
5. Setup Node.js app in cPanel
6. Configure Apache proxy
7. Start application

## 📚 Documentation

### For Developers
- **[Local Development Guide](docs/LOCAL-DEVELOPMENT.md)** - Set up your dev environment
- **[Refactoring Plan](docs/REFACTORING-PLAN.md)** - Architecture decisions and design
- **[Development Plan](docs/development-plan.md)** - Feature roadmap and phases

### For Deployment
- **[Deployment Guide](docs/DEPLOYMENT-GUIDE.md)** - Complete cPanel/shared hosting setup
- **[Server Setup](docs/server-setup.md)** - Server configuration details

### For Understanding
- **[Game Rules](starving-artists-rules.md)** - Official game rules (if available)
- **[API Documentation](docs/API.md)** - API endpoints and WebSocket events

## 🏗️ Architecture

### Technology Stack

**Backend:**
- Express.js (TypeScript)
- Socket.IO (real-time communication)
- MySQL with mysql2
- EJS (templating)
- Express sessions

**Frontend:**
- Vanilla JavaScript (ES6+)
- Bootstrap 5
- Custom CSS with theming
- Socket.IO client

**Database:**
- MySQL 5.7+
- JSON columns for complex state
- Proper indexes and foreign keys

### Project Structure

```
/app
├── server/                  # Backend application
│   ├── src/
│   │   ├── config/         # Environment & database config
│   │   ├── database/       # Database operations
│   │   ├── models/         # TypeScript type definitions
│   │   ├── routes/         # HTTP route handlers
│   │   ├── services/       # Business logic
│   │   │   ├── game/       # Game engine & actions
│   │   │   ├── lobby/      # Lobby management
│   │   │   ├── paint/      # Paint cube logic
│   │   │   ├── canvas/     # Canvas management
│   │   │   └── score/      # Scoring & win conditions
│   │   ├── socket/         # Socket.IO handlers
│   │   └── utils/          # Helper functions
│   ├── views/              # EJS templates
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── components/
│   └── public/             # Static assets
│       ├── css/            # Styles with theming
│       └── js/             # Client-side JavaScript
├── sql/                    # Database schemas
└── docs/                   # Documentation
```

### Design Principles

1. **Single Responsibility**: Each file does one thing (< 500 lines)
2. **Service-Oriented**: Business logic separated from routes
3. **Type Safety**: Full TypeScript coverage
4. **Clean Separation**: Database → Services → Routes → Views
5. **Maintainability**: Clear naming, consistent patterns

## 🎯 Game Flow

```
1. Landing Page
   ↓
2. Create/Join Lobby (2-4 players)
   ↓
3. Host Starts Game
   ↓
4. Game Board Loads
   ↓
5. Turn-Based Actions (Morning/Day/Night)
   - Work: Draw 3 paint cubes
   - Buy Canvas: Purchase from market
   - Paint: Apply cubes to canvas
   - End Turn: Pass to next player
   ↓
6. Selling Phase (After Night)
   - Round-robin selling
   - Nutrition + paint payouts
   - Score updates
   ↓
7. New Day Begins
   ↓
8. Win Condition Check
   - 2p: 7 paintings or 16 points
   - 3p: 6 paintings or 14 points
   - 4p: 5 paintings or 12 points
   ↓
9. Winner Announced!
```

## 🎨 Features in Detail

### Real-Time Multiplayer
- **Instant Updates**: All players see actions immediately
- **Connection Tracking**: Know who's online
- **Automatic Reconnection**: Handle network interruptions
- **Synchronized State**: Everyone sees the same game state

### Game Mechanics
- **Paint System**: 7 colors + wild cubes with proper rules
- **Canvas Market**: 3-slot market with costs (1/2/3 cubes)
- **Painting Validation**: Color matching and wild cube limits
- **Selling Resolution**: Complex payout calculation
- **Nutrition Management**: Starvation and overflow rules
- **Phase System**: Morning/Day/Night/Selling cycle

### User Experience
- **Responsive Design**: Works on all screen sizes
- **Visual Feedback**: Clear turn indicators and phase displays
- **Error Handling**: Helpful error messages
- **Loading States**: Progress indicators
- **Theme Support**: Light theme with dark theme ready

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development|production

# Session
SESSION_SECRET=your-secret-key-here

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=starving_artists
DB_PORT=3306
```

See `.env.example` files for complete configuration options.

### Database Schema

**Tables:**
- `games` - Game sessions
- `players` - Player accounts
- `game_state` - Markets and shared state (JSON)
- `player_canvases` - Owned canvases
- `player_paint_cubes` - Paint inventory
- `canvas_definitions` - Card definitions

## 🧪 Testing

### Manual Testing

1. **Single Player Flow:**
   ```bash
   npm run dev
   # Open http://localhost:4000
   # Create game → Enter lobby → Can't start (need 2+ players)
   ```

2. **Multi-Player Flow:**
   ```bash
   # Browser 1: Create game
   # Browser 2: Join via URL
   # Browser 1: Start game
   # Test all actions in both browsers
   ```

3. **Game Actions:**
   - Work action draws cubes
   - Buy canvas from each slot
   - Paint squares with valid colors
   - Complete canvas
   - Sell paintings
   - Win condition triggers

## 🤝 Contributing

### Code Style
- TypeScript for backend
- Vanilla JavaScript for frontend
- ESLint configuration (if added)
- Max 500 lines per file
- Clear function names
- Comprehensive comments

### Adding Features

1. Create service in `server/src/services/`
2. Add database operations in `server/src/database/`
3. Create route in `server/src/routes/`
4. Add EJS template in `server/views/`
5. Add client JS in `server/public/js/`
6. Update documentation

## 📝 API Endpoints

### REST API

```
GET  /                         Landing page
GET  /lobby/:gameId            Lobby page
POST /lobby/create             Create new lobby
POST /lobby/join/:gameId       Join lobby
POST /lobby/:gameId/start      Start game
GET  /game/:gameId             Game page
POST /game/:gameId/action/*    Game actions
```

### WebSocket Events

```
Lobby Events:
- join-lobby
- leave-lobby
- player-joined
- player-left
- lobby-state

Game Events:
- join-game
- action:work
- action:buy-canvas
- action:paint
- action:end-turn
- action:sell
- game-state
- turn-changed
- game-ended
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Verify MySQL is running
mysql -u root -p

# Check credentials in .env
cat server/.env
```

**Port Already in Use:**
```bash
# Find process on port 4000
lsof -i :4000

# Kill it
kill -9 <PID>
```

**Build Errors:**
```bash
# Clean rebuild
rm -rf server/dist server/node_modules
npm install
npm run build
```

See [docs/DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md) for more troubleshooting.

## 📄 License

[Your License Here] - e.g., MIT, GPL, Proprietary

## 🙏 Acknowledgments

- **Starving Artists Board Game** © 2016 Fairway 3 Games, LLC
- Built with modern web technologies
- Optimized for shared hosting deployment

## 📞 Support

- **Documentation**: See `/docs/` directory
- **Issues**: GitHub Issues (if public repo)
- **Email**: your-email@example.com

## 🎉 Version History

### Version 2.0 (January 2025)
- ✨ Complete rewrite from React to vanilla JS
- ✨ Service-oriented backend architecture
- ✨ Full game rules implementation
- ✨ Shared hosting optimization
- ✨ Modern UI with Bootstrap 5
- ✨ Real-time multiplayer with Socket.IO
- ✨ Complete documentation

### Version 1.0 (Previous)
- React frontend
- WebSocket + Socket.IO dual transport
- Complex architecture

---

**Built with ❤️ for board game enthusiasts**

**Ready to Play**: [Your Deployed URL]

## Documentation

- **[Development Plan](docs/development-plan.md)** - Project phases and current status
- **[Shared Hosting Deployment](docs/shared-hosting-deployment.md)** - Complete deployment guide
- **[Real-time Architecture](docs/realtime-socket-io.md)** - Socket.IO and WebSocket implementation
- **[Game Rules](docs/game-rules.md)** - Official Starving Artists game rules
- **[Agent Instructions](AGENTS.md)** - Developer guidelines and architecture rules

## Project Structure

```
starving-artists-game/
├── server/                 # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── app.ts         # Express application setup
│   │   ├── index.ts       # Server entry point
│   │   ├── config/        # Configuration and environment
│   │   ├── db/            # Database layer (MySQL)
│   │   ├── game/          # Game engine and rules
│   │   ├── lobby/         # Lobby management
│   │   └── realtime/      # Socket.IO and WebSocket handlers
│   └── package.json
├── client/                 # Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── state/         # State management
│   │   ├── lobby/         # Lobby UI
│   │   └── game/          # Game UI
│   └── package.json
├── shared/                 # Shared TypeScript types
│   └── types/
├── docs/                   # Documentation
├── sql/                    # Database schemas
├── .htaccess              # Apache reverse proxy config
└── package.json           # Workspace root

```

## Environment Variables

### Server (`server/.env`)

```bash
# Server
PORT=4000

# Database
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=starving_artists
DB_PORT=3306

# Real-time
REALTIME_SOCKET_IO_ENABLED=true
REALTIME_WSS_ENABLED=true
SOCKET_IO_PATH=/socket.io

# CORS
ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
```

### Client (`client/.env`) - Optional

```bash
# Only needed for development against remote server
VITE_API_BASE=http://localhost:4000
```

## API Endpoints

### REST API

- `GET /health` - Health check
- `GET /realtime/health` - Real-time transport status
- `POST /api/lobby/create` - Create new game lobby
- `POST /api/lobby/:gameId/join` - Join existing lobby
- `POST /api/lobby/:gameId/leave` - Leave lobby
- `POST /api/lobby/:gameId/start` - Start game

### Real-time (Socket.IO)

- `/lobby` namespace - Lobby state synchronization
- `/game` namespace - Game state and player actions

### Real-time (WebSocket Fallback)

- `/realtime/lobby` - Lobby WebSocket
- `/realtime/game` - Game WebSocket

## Testing

Execute the test suite:
```bash
npm test
```

Run specific workspace tests:
```bash
npm run server:test
npm run client:test
```
