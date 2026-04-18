import { ScoreResult as ScoreResultData } from '@/lib/types';
import ScoreBadge from './ScoreBadge';

export type { ScoreResultData };

interface Props {
  result: ScoreResultData;
}

export default function ScoreResult({ result }: Props) {
  const { aPoints, cPoints, fvnPercentage, totalScore, isHfss } = result;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">NPM Score Result</h3>
        <ScoreBadge isHfss={isHfss} score={totalScore} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
            A Points (negative) — {aPoints.total}/40
          </h4>
          <div className="space-y-1 text-sm">
            <Row label="Energy" value={aPoints.energy} max={10} />
            <Row label="Saturated Fat" value={aPoints.saturatedFat} max={10} />
            <Row label="Sugar" value={aPoints.sugar} max={10} />
            <Row label="Sodium" value={aPoints.sodium} max={10} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
            C Points (positive) — {cPoints.total}/15
          </h4>
          <div className="space-y-1 text-sm">
            <Row label={`FVN (${fvnPercentage.toFixed(0)}%)`} value={cPoints.fruitVegNuts} max={5} />
            {result.fvnBreakdown && (
              <div className="ml-4 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                <BreakdownRow label="Standard FVN (fresh / nuts / pulses)" percent={result.fvnBreakdown.standardFvn} />
                <BreakdownRow label="Dried + conc. tomato (&times;2)" percent={result.fvnBreakdown.driedAndConcentrated} title="Per UK NPM 2011, dried fruit/veg and concentrated tomato purée count double toward FVN%" />
                <BreakdownRow label="Other ingredients" percent={result.fvnBreakdown.other} />
              </div>
            )}
            <Row label="Fibre" value={cPoints.fibre} max={5} />
            <Row
              label="Protein"
              value={cPoints.proteinApplied}
              max={5}
              note={cPoints.proteinApplied !== cPoints.protein ? '(blocked: A pts >= 11, FVN < 5)' : undefined}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-sm text-gray-700 dark:text-gray-300">
        <span className="font-mono">
          {aPoints.total} (A) - {cPoints.total} (C) = <strong>{totalScore}</strong>
        </span>
        {result.isDrink && (
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">(drink threshold: score &ge; 1)</span>
        )}
        {!result.isDrink && (
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">(food threshold: score &ge; 4)</span>
        )}
      </div>
    </div>
  );
}

function BreakdownRow({ label, percent, title }: { label: string; percent: number; title?: string }) {
  return (
    <div className="flex justify-between" title={title}>
      <span>{label}</span>
      <span className="font-mono">{percent.toFixed(1)}%</span>
    </div>
  );
}

function Row({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 sm:w-28 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div className="h-2 rounded-full bg-current" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono">{value}</span>
      {note && <span className="text-xs text-amber-600 dark:text-amber-400">{note}</span>}
    </div>
  );
}
