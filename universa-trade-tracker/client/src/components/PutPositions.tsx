import { PutPosition } from '../types';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function PutPositions({ puts }: { puts: PutPosition[] }) {
  if (puts.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-lg font-semibold mb-2">Put Option Positions</h3>
        <p className="text-gray-500 text-sm">No put positions yet. Invest to auto-allocate.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-3">Put Option Positions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left py-2 pr-4">Strike</th>
              <th className="text-left py-2 pr-4">Expiry</th>
              <th className="text-right py-2 pr-4">Contracts</th>
              <th className="text-right py-2 pr-4">Entry Price</th>
              <th className="text-right py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {puts.map(p => (
              <tr key={p.id} className="border-b border-gray-800/50">
                <td className="py-2 pr-4 font-mono">{formatCurrency(p.strike)}</td>
                <td className="py-2 pr-4">{p.expiry}</td>
                <td className="py-2 pr-4 text-right">{p.contracts}</td>
                <td className="py-2 pr-4 text-right font-mono">{formatCurrency(p.entryPrice)}</td>
                <td className="py-2 text-right font-mono">{formatCurrency(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
