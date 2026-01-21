// TypeScript session type declarations
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    playerId?: string;
    gameId?: string;
  }
}

export {};
