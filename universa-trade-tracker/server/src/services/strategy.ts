import db from '../db';
import { getSpyQuote, getSpyOptions } from './yahoo';

const SPY_ALLOCATION = 0.965;
const PUT_ALLOCATION = 0.035;
const REBALANCE_THRESHOLD = 0.01; // 1% drift triggers alert

interface InvestResult {
  spyShares: number;
  spyPrice: number;
  spyCost: number;
  putContracts: number;
  putStrike: number;
  putExpiry: string;
  putPrice: number;
  putCost: number;
  remainingCash: number;
}

export async function investCash(portfolioId: number): Promise<InvestResult> {
  const portfolio = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(portfolioId) as any;
  if (!portfolio) throw new Error('Portfolio not found');
  if (portfolio.current_cash <= 0) throw new Error('No cash to invest');

  const cash = portfolio.current_cash;
  const spyBudget = cash * SPY_ALLOCATION;
  const putBudget = cash * PUT_ALLOCATION;

  // Get current SPY price
  const quote = await getSpyQuote();
  const spyPrice = quote.price!;

  // Buy SPY shares (fractional allowed in simulation)
  const spyShares = Math.floor((spyBudget / spyPrice) * 100) / 100;
  const spyCost = spyShares * spyPrice;

  // Get put options — pick OTM puts ~20-30% below current price
  const optionsData = await getSpyOptions();
  const targetStrike = spyPrice * 0.75; // ~25% OTM

  // Find the put closest to our target strike
  const puts = optionsData.puts.filter((p: any) => !p.inTheMoney && p.lastPrice > 0);
  let selectedPut = puts[0];
  let minDiff = Infinity;
  for (const p of puts) {
    const diff = Math.abs(p.strike - targetStrike);
    if (diff < minDiff) {
      minDiff = diff;
      selectedPut = p;
    }
  }

  if (!selectedPut) {
    throw new Error('No suitable put options found');
  }

  // Each contract = 100 shares
  const putPricePerContract = selectedPut.lastPrice * 100;
  const putContracts = Math.max(1, Math.floor(putBudget / putPricePerContract));
  const putCost = putContracts * putPricePerContract;
  const totalSpent = spyCost + putCost;
  const remainingCash = cash - totalSpent;

  // Record positions and transactions in a transaction
  const insertPosition = db.prepare(
    'INSERT INTO positions (portfolio_id, type, quantity, entry_price, strike, expiry) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertTransaction = db.prepare(
    'INSERT INTO transactions (portfolio_id, action, quantity, price, total) VALUES (?, ?, ?, ?, ?)'
  );
  const updateCash = db.prepare('UPDATE portfolio SET current_cash = ? WHERE id = ?');

  const expiryDate = optionsData.expirationDate
    ? new Date(optionsData.expirationDate).toISOString().split('T')[0]
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const runTransaction = db.transaction(() => {
    // SPY position
    insertPosition.run(portfolioId, 'SPY', spyShares, spyPrice, null, null);
    insertTransaction.run(portfolioId, 'BUY_SPY', spyShares, spyPrice, spyCost);

    // Put position
    insertPosition.run(portfolioId, 'PUT', putContracts, selectedPut.lastPrice, selectedPut.strike, expiryDate);
    insertTransaction.run(portfolioId, 'BUY_PUT', putContracts, selectedPut.lastPrice, putCost);

    // Update cash
    updateCash.run(remainingCash, portfolioId);
  });

  runTransaction();

  return {
    spyShares,
    spyPrice,
    spyCost,
    putContracts,
    putStrike: selectedPut.strike,
    putExpiry: expiryDate,
    putPrice: selectedPut.lastPrice,
    putCost,
    remainingCash,
  };
}

export async function getPortfolioSummary(portfolioId: number) {
  const portfolio = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(portfolioId) as any;
  if (!portfolio) throw new Error('Portfolio not found');

  const openPositions = db.prepare(
    'SELECT * FROM positions WHERE portfolio_id = ? AND closed_at IS NULL'
  ).all(portfolioId) as any[];

  let spyValue = 0;
  let putValue = 0;
  let spyShares = 0;
  let putContracts = 0;
  let spyPrice = 0;

  if (openPositions.length > 0) {
    try {
      const quote = await getSpyQuote();
      spyPrice = quote.price!;
    } catch {
      // Use entry price as fallback
      const spyPos = openPositions.find((p: any) => p.type === 'SPY');
      spyPrice = spyPos?.entry_price || 0;
    }

    for (const pos of openPositions) {
      if (pos.type === 'SPY') {
        spyShares += pos.quantity;
        spyValue += pos.quantity * spyPrice;
      } else if (pos.type === 'PUT') {
        putContracts += pos.quantity;
        // Approximate put value using entry price (would need real-time options pricing for accuracy)
        putValue += pos.quantity * pos.entry_price * 100;
      }
    }
  }

  const totalValue = portfolio.current_cash + spyValue + putValue;
  const totalPnL = totalValue - portfolio.initial_cash;
  const totalPnLPercent = (totalPnL / portfolio.initial_cash) * 100;

  const spyAllocation = totalValue > 0 ? (spyValue / totalValue) * 100 : 0;
  const putAllocation = totalValue > 0 ? (putValue / totalValue) * 100 : 0;
  const cashAllocation = totalValue > 0 ? (portfolio.current_cash / totalValue) * 100 : 100;

  // Check if rebalancing is needed
  const spyDrift = Math.abs(spyAllocation / 100 - SPY_ALLOCATION);
  const putDrift = Math.abs(putAllocation / 100 - PUT_ALLOCATION);
  const needsRebalance = spyDrift > REBALANCE_THRESHOLD || putDrift > REBALANCE_THRESHOLD;

  return {
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      initialCash: portfolio.initial_cash,
      currentCash: portfolio.current_cash,
      createdAt: portfolio.created_at,
    },
    positions: {
      spy: { shares: spyShares, value: spyValue, price: spyPrice },
      puts: openPositions.filter((p: any) => p.type === 'PUT').map((p: any) => ({
        id: p.id,
        contracts: p.quantity,
        entryPrice: p.entry_price,
        strike: p.strike,
        expiry: p.expiry,
        value: p.quantity * p.entry_price * 100,
      })),
      putTotalValue: putValue,
      putTotalContracts: putContracts,
    },
    totalValue,
    totalPnL,
    totalPnLPercent,
    allocation: {
      spy: spyAllocation,
      puts: putAllocation,
      cash: cashAllocation,
    },
    targetAllocation: {
      spy: SPY_ALLOCATION * 100,
      puts: PUT_ALLOCATION * 100,
    },
    needsRebalance,
  };
}
