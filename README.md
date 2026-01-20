# Starving Artists Online

An online multiplayer implementation of the Starving Artists board game with real-time synchronization.

## Features

- **Full-stack TypeScript/JavaScript** application
- **Real-time multiplayer** using Socket.IO (primary) and WebSocket (fallback)
- **Shared hosting compatible** - works on Apache/cPanel environments
- **Domain-agnostic** - automatically adapts to any domain
- **React frontend** with modern drag-and-drop painting interface
- **Express backend** with authoritative game state management
- **MySQL database** for persistence

## Architecture

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: MySQL
- **Real-time**: Socket.IO (primary) + WebSocket (fallback)
- **Hosting**: Optimized for shared hosting (Apache/cPanel)

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- MySQL 5.7 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/starving-artists-game.git
cd starving-artists-game
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Server configuration
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Client configuration (optional for development)
cp client/.env.example client/.env
```

4. Initialize database:
```bash
# Import sql/init-schema.sql into your MySQL database
mysql -u your_user -p your_database < sql/init-schema.sql
```

5. Build the application:
```bash
npm run server:build
npm run client:build
```

6. Start the server:
```bash
npm run server:start
```

The application will be available at `http://localhost:4000`

## Development

### Running in Development Mode

Terminal 1 - Backend:
```bash
npm run server:dev
```

Terminal 2 - Frontend:
```bash
npm run client:dev
```

Frontend dev server: `http://localhost:5173`  
Backend API server: `http://localhost:4000`

## Deployment

### Shared Hosting (Apache/cPanel)

See **[docs/shared-hosting-deployment.md](docs/shared-hosting-deployment.md)** for complete deployment instructions including:
- cPanel Node.js app setup
- Apache reverse proxy configuration
- Environment variables
- Database initialization
- Troubleshooting

### Key Deployment Files

- `.htaccess` - Apache reverse proxy rules
- `server/.env.example` - Server configuration template
- `client/.env.example` - Client configuration template (optional)

## Documentation

- **[Development Plan](docs/development-plan.md)** - Project phases and current status
- **[Shared Hosting Deployment](docs/shared-hosting-deployment.md)** - Complete deployment guide
- **[Real-time Architecture](docs/realtime-socket-io.md)** - Socket.IO and WebSocket implementation
- **[Game Rules](docs/game-rules.md)** - Official Starving Artists game rules
- **[Agent Instructions](AGENTS.md)** - Developer guidelines and architecture rules

## Testing

Execute `npm test` to run the shared Jest suite covering the Express health check, the mocked database pool, and shared types.

## Database Setup

Apply `sql/init-schema.sql` to create the initial MySQL schema (users, games, game_players, snapshot store, and canvas catalog).
