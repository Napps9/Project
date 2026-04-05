import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Transaction } from '../types';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  BUY_SPY: { label: 'Buy SPY', color: 'text-green-400' },
  SELL_SPY: { label: 'Sell SPY', color: 'text-red-400' },
  BUY_PUT: { label: 'Buy Put', color: 'text-yellow-400' },
  SELL_PUT: { label: 'Sell Put', color: 'text-orange-400' },
  DEPOSIT: { label: 'Deposit', color: 'text-blue-400' },
  WITHDRAW: { label: 'Withdraw', color: 'text-gray-400' },
};

export default function TransactionLog({ portfolioId }: { portfolioId: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    api.getTransactions(portfolioId)
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, [portfolioId]);

  if (transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
        <p className="text-gray-500 text-sm">No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left py-2 pr-4">Date</th>
              <th className="text-left py-2 pr-4">Action</th>
              <th className="text-right py-2 pr-4">Qty</th>
              <th className="text-right py-2 pr-4">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => {
              const info = ACTION_LABELS[t.action] || { label: t.action, color: 'text-gray-400' };
              return (
                <tr key={t.id} className="border-b border-gray-800/50">
                  <td className="py-2 pr-4 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className={`py-2 pr-4 font-medium ${info.color}`}>{info.label}</td>
                  <td className="py-2 pr-4 text-right font-mono">{t.quantity}</td>
                  <td className="py-2 pr-4 text-right font-mono">{formatCurrency(t.price)}</td>
                  <td className="py-2 text-right font-mono">{formatCurrency(t.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
