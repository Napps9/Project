import { PortfolioSummary as PortfolioSummaryType } from '../types';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function PortfolioSummary({ data }: { data: PortfolioSummaryType }) {
  const { totalValue, totalPnL, totalPnLPercent, portfolio, positions } = data;
  const pnlColor = totalPnL >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Total Value" value={formatCurrency(totalValue)} />
      <Card
        label="Total P&L"
        value={`${formatCurrency(totalPnL)} (${totalPnLPercent.toFixed(2)}%)`}
        valueClass={pnlColor}
      />
      <Card label="Cash" value={formatCurrency(portfolio.currentCash)} />
      <Card
        label="SPY Price"
        value={positions.spy.price ? formatCurrency(positions.spy.price) : '—'}
        sub={`${positions.spy.shares.toFixed(2)} shares`}
      />
    </div>
  );
}

function Card({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClass || 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
