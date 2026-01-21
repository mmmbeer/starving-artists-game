// Express application setup
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import compression from 'compression';
import { config } from './config/env';

export function createApp(): Express {
  const app = express();

  // View engine setup
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');

  // Middleware
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Import routes
  const indexRoutes = require('./routes/index.routes').default;
  const lobbyRoutes = require('./routes/lobby.routes').default;
  const gameRoutes = require('./routes/game.routes').default;

  // Register routes
  app.use('/', indexRoutes);
  app.use('/lobby', lobbyRoutes);
  app.use('/game', gameRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).render('pages/404', { title: 'Page Not Found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
      error: config.nodeEnv === 'development' ? err : {},
    });
  });

  return app;
}
