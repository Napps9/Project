import { Router, Request, Response } from 'express';
import { getTobinQ } from '../services/fred';

const router = Router();

router.get('/tobin-q', async (_req: Request, res: Response) => {
  try {
    const data = await getTobinQ();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
