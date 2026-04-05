import { Router, Request, Response } from 'express';
import db from '../db';
import { investCash, getPortfolioSummary } from '../services/strategy';

type IdParams = { id: string };

const router = Router();

// Create a new portfolio
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, initialCash } = req.body;
    if (!initialCash || initialCash <= 0) {
      res.status(400).json({ error: 'initialCash must be a positive number' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO portfolio (name, initial_cash, current_cash) VALUES (?, ?, ?)'
    ).run(name || 'My Portfolio', initialCash, initialCash);

    const portfolio = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(portfolio);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get portfolio summary with live valuations
router.get('/:id', async (req: Request<IdParams>, res: Response) => {
  try {
    const summary = await getPortfolioSummary(parseInt(req.params.id));
    res.json(summary);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Auto-invest cash using Universa strategy
router.post('/:id/invest', async (req: Request<IdParams>, res: Response) => {
  try {
    const result = await investCash(parseInt(req.params.id));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get open positions
router.get('/:id/positions', (req: Request<IdParams>, res: Response) => {
  try {
    const positions = db.prepare(
      'SELECT * FROM positions WHERE portfolio_id = ? AND closed_at IS NULL ORDER BY opened_at DESC'
    ).all(parseInt(req.params.id));
    res.json(positions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get transaction history
router.get('/:id/transactions', (req: Request<IdParams>, res: Response) => {
  try {
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY created_at DESC'
    ).all(parseInt(req.params.id));
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all portfolios
router.get('/', (_req: Request, res: Response) => {
  try {
    const portfolios = db.prepare('SELECT * FROM portfolio ORDER BY created_at DESC').all();
    res.json(portfolios);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
