import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import lobbyRouter from './lobby/lobbyRoutes';
import { getRealtimeHealth } from './realtime/health';

const parseOrigins = (value?: string) =>
  value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];

const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS).length
  ? parseOrigins(process.env.ALLOWED_ORIGINS)
  : ['https://www.starvingartistsgame.com', 'https://starvingartistsgame.com'];

const applyCorsHeaders = (req: Request, res: Response) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type,Authorization,X-Requested-With,Accept'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

const clientDistCandidates = [
  path.resolve(__dirname, '..', '..', '..', '..', 'client', 'dist'),
  path.resolve(__dirname, '..', '..', 'client', 'dist'),
];

const clientDist = clientDistCandidates.find((candidate) => fs.existsSync(candidate));

if (!clientDist) {
  throw new Error(`client dist directory not found; checked ${clientDistCandidates.join(', ')}`);
}

export const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    applyCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/realtime/health', (_req: Request, res: Response) => {
    res.status(200).json(getRealtimeHealth());
  });

  app.use('/lobby', lobbyRouter);

  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
};

export default createApp;
