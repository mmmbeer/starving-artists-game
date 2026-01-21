# Starving Artists Online - Product Requirements Document

## Overview
Starving Artists Online is a web-based multiplayer board game where players compete to create the most valuable art collection. Players manage their nutrition, collect paint cubes, purchase canvases, and complete paintings to earn points.

## Original Problem Statement
Build an online multiplayer version of the "Starving Artists" board game with:
- Real-time multiplayer gameplay via Socket.IO
- Turn-based mechanics
- Drag-and-drop painting interface
- Modern, sleek art aesthetic UI
- Deployable to shared hosting (cPanel)

## Tech Stack
- **Backend**: Node.js, Express.js, TypeScript
- **Frontend**: EJS templates, Vanilla JavaScript, CSS
- **Real-time**: Socket.IO
- **Database**: MySQL (production) / In-memory store (development)
- **CSS Framework**: Bootstrap 5 + Custom theming system

## Core User Flow
1. Landing page - Create or join game
2. Game lobby - Wait for players, share invite link
3. Game host starts the game
4. Turn-based gameplay:
   - Morning/Day/Night phases
   - Work (draw paint cubes)
   - Buy canvases from market
   - Paint canvases (drag-and-drop)
   - Earn points for completed paintings
5. Game ends when win condition met
6. Display winner and final scores

## Data Models

### Game
- id, status (lobby/playing/finished)
- host_player_id, current_player_id
- current_phase, day_number, turn_count
- winner_id, timestamps

### Player  
- id, game_id, name
- nutrition, score, paintings_completed
- turn_order, is_host, connected

### Canvas Definition
- id, name, star_value, paint_value, food_value
- layout_json (grid squares with allowed colors)

### Player Canvas
- id, player_id, canvas_definition_id
- painted_squares, completed

### Paint Cube
- id, color, is_wild

## Completed Features (Phase 4 - January 2026)

### ✅ Landing Page
- Create new game form
- Join existing game form
- Feature showcase section
- Responsive design

### ✅ Game Lobby
- Real-time player list (Socket.IO)
- Copy invite link functionality
- Start game button (host only, 2+ players)
- Leave lobby functionality
- Online/offline status indicators
- **Real-time updates when players join via HTTP API**

### ✅ Game Board UI
- Phase indicator (Morning/Day/Night/Selling)
- Turn indicator (Your Turn / [Player]'s Turn)
- Players sidebar with stats
- Canvas market (3 slots with cost, values, grid preview)
- Paint market (shared paint cubes)
- Player studio (personal paint cubes, action buttons)
- Player canvases with progress tracking

### ✅ Game Actions
- Work action (draw 3 paint cubes)
- End turn action
- Buy canvas from market
- Paint action (drag-and-drop pending)
- Turn advancement

### ✅ Real-time Updates
- Socket.IO integration for game state sync
- Player join/leave notifications
- Turn change notifications
- Action broadcast to all players
- **HTTP endpoints emit Socket.IO events for real-time lobby updates**

### ✅ Theming System
- CSS variables for easy customization
- Default theme with art-inspired colors
- Responsive grid layouts

### ✅ Static Pages
- Rules page with game instructions
- About page with game information

## Pending/In-Progress Features

### 🔄 Drag-and-Drop Painting
- Paint cube dragging implemented
- Drop zone highlighting implemented
- Need to verify end-to-end painting flow

### 📋 Phase 5: Testing & Polish
- End-to-end testing of full game flow
- Edge case handling
- UI animations and polish
- Error handling improvements

## API Endpoints

### HTTP Routes
- `GET /` - Landing page
- `POST /lobby/create` - Create new game
- `GET /lobby/:gameId` - Lobby page
- `POST /lobby/join/:gameId` - Join game
- `POST /lobby/:gameId/start` - Start game
- `POST /lobby/:gameId/leave` - Leave lobby
- `GET /game/:gameId` - Game page
- `POST /game/:gameId/action/work` - Work action
- `POST /game/:gameId/action/buy-canvas` - Buy canvas
- `POST /game/:gameId/action/paint` - Paint action
- `POST /game/:gameId/action/end-turn` - End turn

### Socket.IO Events
- `join-lobby` / `leave-lobby`
- `lobby-state` / `player-joined` / `player-left`
- `game-starting`
- `join-game` / `leave-game`
- `game-state` / `action-performed`
- `turn-changed` / `game-ended`

## File Structure
```
/app/server/
├── src/                  # TypeScript source
│   ├── config/          # Configuration
│   ├── database/        # DB operations
│   ├── models/          # Types
│   ├── routes/          # HTTP routes
│   ├── services/        # Business logic
│   ├── socket/          # Socket.IO handlers
│   └── utils/           # Utilities
├── views/               # EJS templates
│   ├── layouts/         # Base layouts
│   └── pages/           # Page templates
├── public/              # Static files
│   ├── css/            # Stylesheets
│   │   ├── themes/     # Theme files
│   │   └── *.css       # Component styles
│   └── js/             # Client-side JS
│       ├── core/       # API/Socket clients
│       ├── game/       # Game-specific
│       └── utils/      # DOM/UI helpers
└── dist/               # Compiled output
```

## Known Limitations
- In-memory database for development (MySQL required for production)
- Session-based player identification
- No persistent game history

## Next Steps (Priority Order)
1. **P0**: Complete drag-and-drop painting flow testing
2. **P0**: End-to-end game flow testing (create→lobby→play→win)
3. **P1**: Error handling and edge cases
4. **P1**: UI/UX polish and animations
5. **P2**: MySQL database integration for production
6. **P2**: Deployment documentation for cPanel
