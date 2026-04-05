import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../api/client';
import { TobinQData } from '../types';

const SIGNAL_COLORS: Record<string, string> = {
  undervalued: 'text-green-400',
  fair: 'text-yellow-400',
  overvalued: 'text-red-400',
};

const SIGNAL_BG: Record<string, string> = {
  undervalued: 'bg-green-900/30 border-green-700',
  fair: 'bg-yellow-900/30 border-yellow-700',
  overvalued: 'bg-red-900/30 border-red-700',
};

export default function TobinQ() {
  const [data, setData] = useState<TobinQData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTobinQ()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-48 flex items-center justify-center text-gray-500">Loading Tobin's Q...</div>;
  if (!data) return null;

  const { current, history, source } = data;
  const signalColor = SIGNAL_COLORS[current.signal] || 'text-gray-400';
  const signalBg = SIGNAL_BG[current.signal] || '';

  const chartData = history.map(h => ({
    date: h.date.slice(0, 7), // YYYY-MM
    value: h.value,
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Tobin's Q Ratio</h3>
          <p className="text-xs text-gray-500 mt-1">
            Market valuation indicator {source === 'mock' ? '(sample data)' : '(FRED)'}
          </p>
        </div>
        <div className={`px-3 py-2 rounded-lg border ${signalBg}`}>
          <p className="text-2xl font-bold font-mono">{current.value.toFixed(2)}</p>
          <p className={`text-sm font-medium capitalize ${signalColor}`}>{current.signal}</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2 flex gap-4">
        <span><span className="text-green-400">{'<'}1.0</span> = Undervalued</span>
        <span><span className="text-yellow-400">1.0–1.5</span> = Fair</span>
        <span><span className="text-red-400">{'>'}1.5</span> = Overvalued</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} interval="preserveStartEnd" />
          <YAxis domain={[0.5, 2]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
          <ReferenceLine y={1.0} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Fair Value', fill: '#22c55e', fontSize: 10 }} />
          <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overvalued', fill: '#ef4444', fontSize: 10 }} />
          <Line type="monotone" dataKey="value" stroke="#f59e0b" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
