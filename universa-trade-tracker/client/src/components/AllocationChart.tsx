import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Props {
  allocation: { spy: number; puts: number; cash: number };
  targetAllocation: { spy: number; puts: number };
}

const COLORS = ['#3b82f6', '#ef4444', '#6b7280'];

export default function AllocationChart({ allocation, targetAllocation }: Props) {
  const data = [
    { name: 'SPY', value: parseFloat(allocation.spy.toFixed(1)) },
    { name: 'Puts', value: parseFloat(allocation.puts.toFixed(1)) },
    { name: 'Cash', value: parseFloat(allocation.cash.toFixed(1)) },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-2">Portfolio Allocation</h3>
      <div className="flex items-center gap-6">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-gray-400">Target Allocation:</p>
          <p><span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>SPY: {targetAllocation.spy}%</p>
          <p><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>Puts: {targetAllocation.puts}%</p>
        </div>
      </div>
    </div>
  );
}
