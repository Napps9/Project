import { Router, Request, Response } from 'express';
import { getSpyQuote, getSpyHistory, getSpyOptions, getSpyOptionsForExpiry } from '../services/yahoo';

const router = Router();

// Current SPY quote
router.get('/quote', async (_req: Request, res: Response) => {
  try {
    const quote = await getSpyQuote();
    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SPY historical prices
router.get('/history', async (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '1y';
    const history = await getSpyHistory(range);
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SPY put options chain
router.get('/options', async (req: Request, res: Response) => {
  try {
    const expiry = req.query.expiry as string;
    const options = expiry ? await getSpyOptionsForExpiry(expiry) : await getSpyOptions();
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
