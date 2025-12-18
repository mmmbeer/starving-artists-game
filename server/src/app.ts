import express, { Request, Response } from 'express';
import path from 'path';
import lobbyRouter from './lobby/lobbyRoutes';

const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');

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
