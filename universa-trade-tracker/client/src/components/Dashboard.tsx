import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { PortfolioSummary as PortfolioSummaryType, SpyQuote } from '../types';
import PortfolioSummary from './PortfolioSummary';
import AllocationChart from './AllocationChart';
import SpyPriceChart from './SpyPriceChart';
import PutPositions from './PutPositions';
import TobinQ from './TobinQ';
import TransactionLog from './TransactionLog';
import RebalanceAlert from './RebalanceAlert';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function Dashboard() {
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null);
  const [quote, setQuote] = useState<SpyQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cashInput, setCashInput] = useState('100000');
  const [error, setError] = useState('');

  const loadPortfolio = useCallback(async (id: number) => {
    try {
      const data = await api.getPortfolio(id);
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Load existing portfolio or show create form
  useEffect(() => {
    api.listPortfolios()
      .then(portfolios => {
        if (portfolios.length > 0) {
          setPortfolioId(portfolios[0].id);
          return loadPortfolio(portfolios[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadPortfolio]);

  // Fetch SPY quote and auto-refresh every 30s
  useEffect(() => {
    const fetchQuote = () => {
      api.getQuote().then(setQuote).catch(() => {});
    };
    fetchQuote();
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    const cash = parseFloat(cashInput);
    if (isNaN(cash) || cash <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const portfolio = await api.createPortfolio('My Portfolio', cash);
      setPortfolioId(portfolio.id);
      await loadPortfolio(portfolio.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInvest = async () => {
    if (!portfolioId) return;
    setInvesting(true);
    setError('');
    try {
      await api.invest(portfolioId);
      await loadPortfolio(portfolioId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInvesting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 text-gray-500">Loading...</div>;
  }

  // No portfolio yet — show create form
  if (!portfolioId || !summary) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h2 className="text-2xl font-bold mb-2">Create Your Portfolio</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter your initial investment amount. The Universa strategy will automatically
          allocate 96.5% to SPY and 3.5% to protective put options.
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={cashInput}
              onChange={e => setCashInput(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-8 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100000"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{summary.portfolio.name}</h2>
          <p className="text-gray-400 text-sm">
            Initial investment: {formatCurrency(summary.portfolio.initialCash)}
            {quote && (
              <span className="ml-4">
                SPY: {formatCurrency(quote.price)}{' '}
                <span className={quote.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
                </span>
              </span>
            )}
          </p>
        </div>
        {summary.portfolio.currentCash > 0 && (
          <button
            onClick={handleInvest}
            disabled={investing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-5 py-2 rounded-lg font-medium transition-colors"
          >
            {investing ? 'Investing...' : `Invest ${formatCurrency(summary.portfolio.currentCash)}`}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Rebalance Alert */}
      <RebalanceAlert
        needsRebalance={summary.needsRebalance}
        allocation={summary.allocation}
        target={summary.targetAllocation}
      />

      {/* Summary Cards */}
      <PortfolioSummary data={summary} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationChart
          allocation={summary.allocation}
          targetAllocation={summary.targetAllocation}
        />
        <SpyPriceChart />
      </div>

      {/* Tobin's Q */}
      <TobinQ />

      {/* Positions and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PutPositions puts={summary.positions.puts} />
        <TransactionLog portfolioId={portfolioId} />
      </div>
    </div>
  );
}
