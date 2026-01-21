// Landing page routes
import { Router, Request, Response } from 'express';

const router = Router();

// Landing page
router.get('/', (_req: Request, res: Response) => {
  res.render('pages/index', {
    title: 'Starving Artists',
  });
});

// Game rules page
router.get('/rules', (_req: Request, res: Response) => {
  res.render('pages/rules', {
    title: 'Game Rules - Starving Artists',
  });
});

// About page
router.get('/about', (_req: Request, res: Response) => {
  res.render('pages/about', {
    title: 'About - Starving Artists',
  });
});

export default router;
