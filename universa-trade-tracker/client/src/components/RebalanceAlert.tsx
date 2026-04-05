export default function RebalanceAlert({ needsRebalance, allocation, target }: {
  needsRebalance: boolean;
  allocation: { spy: number; puts: number; cash: number };
  target: { spy: number; puts: number };
}) {
  if (!needsRebalance) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-4 flex items-start gap-3">
      <span className="text-2xl">!</span>
      <div>
        <p className="font-semibold text-yellow-400">Rebalance Recommended</p>
        <p className="text-sm text-yellow-300/80 mt-1">
          Your portfolio has drifted from the Universa target allocation.
          SPY is at {allocation.spy.toFixed(1)}% (target {target.spy}%),
          Puts at {allocation.puts.toFixed(1)}% (target {target.puts}%).
        </p>
      </div>
    </div>
  );
}
