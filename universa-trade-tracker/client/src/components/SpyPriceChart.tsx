import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';

const RANGES = ['1m', '3m', '6m', '1y', '5y'];

export default function SpyPriceChart() {
  const [range, setRange] = useState('1y');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHistory(range)
      .then(d => setData(d.map((p: any) => ({
        date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        close: p.close,
      }))))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">SPY Price History</h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-sm ${r === range ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="close" stroke="#3b82f6" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
