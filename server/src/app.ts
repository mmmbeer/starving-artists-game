import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import lobbyRouter from './lobby/lobbyRoutes';

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

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/lobby', lobbyRouter);

  app.use(express.static(clientDist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
};

export default createApp;
