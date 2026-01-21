# Starving Artists Online - Complete Refactoring Plan

## Objective
Refactor from React SPA to a simple, maintainable web application using HTML, vanilla JavaScript, CSS, and Express with EJS templates.

## Current Issues
1. **Over-engineered**: React adds unnecessary complexity for a simple board game
2. **Build complexity**: Vite, TypeScript compilation, bundling
3. **Code organization**: Mixed concerns, large files
4. **Maintenance burden**: Complex state management, multiple layers

## Target Architecture

### Frontend
- **Templates**: EJS for server-side rendering
- **JavaScript**: Vanilla JS (ES6+), no frameworks
- **CSS**: Modern CSS (Grid, Flexbox, CSS Variables)
- **Real-time**: Socket.IO client
- **Features**: Drag & drop, animations, responsive design

### Backend
- **Framework**: Express + TypeScript
- **Database**: MySQL with mysql2
- **Templates**: EJS view engine
- **Real-time**: Socket.IO server
- **Architecture**: Service-oriented (Routes → Services → Models)

### Code Organization Principles
1. **Single Responsibility**: Each file does one thing
2. **Maximum 500 lines**: Break large files into smaller modules
3. **Service Layer**: Business logic separated from routes
4. **Clear naming**: Descriptive function and variable names
5. **No duplication**: Shared utilities and helpers

## New Directory Structure

```
/app
├── server/
│   ├── src/
│   │   ├── index.ts                 # Application entry point
│   │   ├── app.ts                   # Express app configuration
│   │   │
│   │   ├── config/                  # Configuration
│   │   │   ├── database.ts          # MySQL connection
│   │   │   ├── env.ts               # Environment variables
│   │   │   └── socket.ts            # Socket.IO configuration
│   │   │
│   │   ├── routes/                  # HTTP routes
│   │   │   ├── index.routes.ts      # Landing page routes
│   │   │   ├── lobby.routes.ts      # Lobby routes
│   │   │   └── game.routes.ts       # Game routes
│   │   │
│   │   ├── services/                # Business logic
│   │   │   ├── game/
│   │   │   │   ├── gameEngine.ts    # Core game logic
│   │   │   │   ├── turnManager.ts   # Turn progression
│   │   │   │   ├── actionHandler.ts # Player actions
│   │   │   │   └── sellingPhase.ts  # Selling resolution
│   │   │   ├── lobby/
│   │   │   │   ├── lobbyManager.ts  # Lobby management
│   │   │   │   └── playerManager.ts # Player join/leave
│   │   │   ├── paint/
│   │   │   │   ├── paintBag.ts      # Paint cube management
│   │   │   │   └── paintMarket.ts   # Paint market logic
│   │   │   ├── canvas/
│   │   │   │   ├── canvasManager.ts # Canvas operations
│   │   │   │   └── canvasMarket.ts  # Canvas market logic
│   │   │   └── score/
│   │   │       └── scoreTracker.ts  # Score calculation
│   │   │
│   │   ├── models/                  # Data models & types
│   │   │   ├── Game.ts              # Game model
│   │   │   ├── Player.ts            # Player model
│   │   │   ├── Canvas.ts            # Canvas model
│   │   │   ├── PaintCube.ts         # Paint cube model
│   │   │   └── types.ts             # Shared types
│   │   │
│   │   ├── socket/                  # Socket.IO handlers
│   │   │   ├── lobby.socket.ts      # Lobby socket events
│   │   │   └── game.socket.ts       # Game socket events
│   │   │
│   │   ├── database/                # Database operations
│   │   │   ├── gameDb.ts            # Game queries
│   │   │   ├── playerDb.ts          # Player queries
│   │   │   └── canvasDb.ts          # Canvas queries
│   │   │
│   │   └── utils/                   # Utilities
│   │       ├── validation.ts        # Input validation
│   │       ├── helpers.ts           # Helper functions
│   │       └── constants.ts         # Game constants
│   │
│   ├── views/                       # EJS templates
│   │   ├── layouts/
│   │   │   └── main.ejs             # Main layout
│   │   ├── partials/
│   │   │   ├── header.ejs           # Header partial
│   │   │   ├── footer.ejs           # Footer partial
│   │   │   └── game-board.ejs       # Game board partial
│   │   ├── pages/
│   │   │   ├── index.ejs            # Landing page
│   │   │   ├── lobby.ejs            # Game lobby
│   │   │   └── game.ejs             # Game page
│   │   └── components/
│   │       ├── player-studio.ejs    # Player studio component
│   │       ├── canvas-market.ejs    # Canvas market component
│   │       └── paint-market.ejs     # Paint market component
│   │
│   ├── public/                      # Static assets
│   │   ├── js/
│   │   │   ├── core/
│   │   │   │   ├── socket-client.js # Socket.IO client wrapper
│   │   │   │   └── api-client.js    # API wrapper
│   │   │   ├── lobby/
│   │   │   │   ├── lobby-ui.js      # Lobby UI logic
│   │   │   │   └── lobby-socket.js  # Lobby socket handlers
│   │   │   ├── game/
│   │   │   │   ├── game-ui.js       # Game UI updates
│   │   │   │   ├── game-socket.js   # Game socket handlers
│   │   │   │   ├── drag-drop.js     # Drag & drop logic
│   │   │   │   ├── actions.js       # Player actions
│   │   │   │   └── animations.js    # UI animations
│   │   │   └── utils/
│   │   │       ├── dom-helpers.js   # DOM manipulation
│   │   │       └── ui-helpers.js    # UI utilities
│   │   │
│   │   ├── css/
│   │   │   ├── main.css             # Global styles
│   │   │   ├── layout.css           # Layout styles
│   │   │   ├── components.css       # Component styles
│   │   │   ├── lobby.css            # Lobby styles
│   │   │   ├── game.css             # Game styles
│   │   │   └── animations.css       # Animation styles
│   │   │
│   │   └── assets/
│   │       └── images/              # Game images
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── sql/
│   ├── schema.sql                   # Database schema
│   └── seed.sql                     # Sample data
│
└── docs/
    ├── REFACTORING-PLAN.md          # This document
    ├── API.md                       # API documentation
    ├── GAME-FLOW.md                 # Game flow documentation
    └── DEPLOYMENT.md                # Deployment guide
```

## User Flow Implementation

### 1. Landing Page (`/`)
- **Template**: `views/pages/index.ejs`
- **Features**:
  - Create new game button
  - Join game by UUID input
  - Game rules link
  - Clean, simple design

### 2. Create/Join Game
- **Route**: `POST /lobby/create` or `POST /lobby/join/:uuid`
- **Process**:
  - Create/join lobby in database
  - Generate player ID
  - Redirect to lobby page
- **Service**: `lobbyManager.createLobby()` / `lobbyManager.joinLobby()`

### 3. Game Lobby (`/lobby/:uuid`)
- **Template**: `views/pages/lobby.ejs`
- **Features**:
  - Show all players
  - Real-time updates via Socket.IO
  - Start game button (host only)
  - Copy invite link
  - Player ready status
- **Socket Events**:
  - `player-joined`
  - `player-left`
  - `game-starting`

### 4. Start Game
- **Route**: `POST /game/:uuid/start`
- **Process**:
  - Validate host permission
  - Initialize game state
  - Redirect all players to game page
- **Service**: `gameEngine.startGame()`

### 5. Game Page (`/game/:uuid`)
- **Template**: `views/pages/game.ejs`
- **Features**:
  - Player studios (nutrition, paint cubes, canvases)
  - Canvas market (3 cards)
  - Paint market (shared pool)
  - Turn indicator
  - Action buttons (Work, Buy Canvas, Paint, End Turn)
  - Drag & drop for painting
  - Score display
  - Phase indicator (Morning/Day/Night)
- **Socket Events**:
  - `turn-changed`
  - `action-performed`
  - `market-updated`
  - `game-state-updated`

### 6. Game Actions
- **Work**: Draw 3 paint cubes
- **Buy Canvas**: Purchase from market
- **Paint**: Drag cubes onto canvas squares
- **End Turn**: Move to next phase/player
- **Socket Events**: Broadcast to all players

### 7. Selling Phase
- **Process**: Round robin canvas selling
- **UI**: Modal for selecting canvases to sell
- **Logic**: Calculate nutrition, paint payout, score
- **Service**: `sellingPhase.processSelling()`

### 8. Score Tracking
- **Display**: Real-time score updates
- **Win Conditions**: 
  - 7 paintings (2 players)
  - 6 paintings (3 players)
  - 5 paintings (4 players)
  - Or point thresholds
- **Service**: `scoreTracker.checkWinCondition()`

### 9. End Game
- **Detection**: After each action/selling phase
- **Display**: Winner announcement, final scores
- **Options**: Play again, return to lobby

## Technical Implementation Details

### Database Schema

```sql
-- Games table
CREATE TABLE games (
  id VARCHAR(36) PRIMARY KEY,
  status ENUM('lobby', 'playing', 'finished') NOT NULL,
  host_player_id VARCHAR(36) NOT NULL,
  current_phase ENUM('morning', 'day', 'night', 'selling') DEFAULT 'morning',
  current_player_id VARCHAR(36),
  day_number INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL
);

-- Players table
CREATE TABLE players (
  id VARCHAR(36) PRIMARY KEY,
  game_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  nutrition INT DEFAULT 5,
  score INT DEFAULT 0,
  paintings_completed INT DEFAULT 0,
  turn_order INT,
  connected BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Game state table (JSON blob for flexibility)
CREATE TABLE game_state (
  game_id VARCHAR(36) PRIMARY KEY,
  paint_bag TEXT,          -- JSON array
  paint_market TEXT,       -- JSON array
  canvas_market TEXT,      -- JSON array
  canvas_deck TEXT,        -- JSON array
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Player canvases table
CREATE TABLE player_canvases (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  canvas_data TEXT,        -- JSON object
  completed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Player paint cubes table
CREATE TABLE player_paint_cubes (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  game_id VARCHAR(36) NOT NULL,
  color VARCHAR(20) NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Canvas definitions (pre-populated)
CREATE TABLE canvas_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  layout_json TEXT,        -- JSON defining squares
  star_value INT,
  paint_value INT,
  food_value INT,
  image_filename VARCHAR(255)
);
```

### Socket.IO Event Structure

```typescript
// Lobby events
socket.on('join-lobby', (data) => {});
socket.emit('player-joined', (player) => {});
socket.emit('player-left', (playerId) => {});
socket.emit('game-starting', (gameId) => {});

// Game events
socket.on('perform-action', (action) => {});
socket.emit('action-performed', (action) => {});
socket.emit('turn-changed', (currentPlayer) => {});
socket.emit('market-updated', (markets) => {});
socket.emit('game-state-updated', (gameState) => {});
socket.emit('game-ended', (winner) => {});
```

### File Size Limits

Each file must stay under 500 lines by:
1. Breaking complex logic into smaller functions
2. Creating separate service files for related operations
3. Using composition over inheritance
4. Extracting utilities and helpers

## Implementation Phases

### Phase 1: Backend Foundation
1. Set up Express + TypeScript
2. Configure database connection
3. Create models and types
4. Implement basic routes

### Phase 2: Core Services
1. Lobby management
2. Game engine
3. Turn management
4. Action handling

### Phase 3: Frontend Templates
1. Create EJS layouts
2. Build landing page
3. Build lobby page
4. Build game page

### Phase 4: Client-Side JavaScript
1. Socket.IO client wrapper
2. Lobby UI logic
3. Game UI logic
4. Drag & drop implementation

### Phase 5: Real-Time Features
1. Socket.IO server setup
2. Lobby socket handlers
3. Game socket handlers
4. State synchronization

### Phase 6: Game Logic
1. Paint management
2. Canvas management
3. Selling phase
4. Score tracking
5. Win condition detection

### Phase 7: Polish & Testing
1. UI animations
2. Error handling
3. Input validation
4. Testing complete flow

### Phase 8: Documentation
1. API documentation
2. Game flow documentation
3. Deployment guide
4. Developer guide

## Success Criteria

- [ ] Landing page loads and is functional
- [ ] Can create a game and enter lobby
- [ ] Can join game via UUID
- [ ] Lobby shows all players in real-time
- [ ] Host can start game
- [ ] All players redirect to game page
- [ ] Game board displays correctly
- [ ] Players can take turns with actions
- [ ] Drag & drop works for painting
- [ ] Markets update in real-time
- [ ] Selling phase works correctly
- [ ] Scores are tracked accurately
- [ ] Win conditions are detected
- [ ] End game displays winner
- [ ] No file exceeds 500 lines
- [ ] All functions follow single responsibility
- [ ] Code is maintainable and well-organized

## Migration Strategy

1. Keep old React code in `/client-old` temporarily
2. Build new version alongside
3. Test thoroughly
4. Switch traffic to new version
5. Remove old code after confirmation

---

**Status**: Planning Complete  
**Next Step**: Begin Phase 1 - Backend Foundation
