import { ScoreResult as ScoreResultType } from '../types';
import ScoreBadge from './ScoreBadge';

interface Props {
  result: ScoreResultType;
}

export default function ScoreResult({ result }: Props) {
  const { aPoints, cPoints, fvnPercentage, totalScore, isHfss } = result;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">NPM Score Result</h3>
        <ScoreBadge isHfss={isHfss} score={totalScore} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* A Points */}
        <div>
          <h4 className="text-sm font-medium text-red-700 mb-2">
            A Points (negative) — {aPoints.total}/40
          </h4>
          <div className="space-y-1 text-sm">
            <Row label="Energy" value={aPoints.energy} max={10} />
            <Row label="Saturated Fat" value={aPoints.saturatedFat} max={10} />
            <Row label="Sugar" value={aPoints.sugar} max={10} />
            <Row label="Sodium" value={aPoints.sodium} max={10} />
          </div>
        </div>

        {/* C Points */}
        <div>
          <h4 className="text-sm font-medium text-green-700 mb-2">
            C Points (positive) — {cPoints.total}/15
          </h4>
          <div className="space-y-1 text-sm">
            <Row label={`FVN (${fvnPercentage.toFixed(0)}%)`} value={cPoints.fruitVegNuts} max={5} />
            <Row label="Fibre" value={cPoints.fibre} max={5} />
            <Row
              label="Protein"
              value={cPoints.proteinApplied}
              max={5}
              note={cPoints.proteinApplied !== cPoints.protein ? `(blocked: A pts >= 11, FVN < 5)` : undefined}
            />
          </div>
        </div>
      </div>

      {/* Final calculation */}
      <div className="border-t pt-4 text-sm text-gray-700">
        <span className="font-mono">
          {aPoints.total} (A) - {cPoints.total} (C) = <strong>{totalScore}</strong>
        </span>
        {result.isDrink && (
          <span className="ml-3 text-xs text-gray-500">(drink threshold: score &ge; 1)</span>
        )}
        {!result.isDrink && (
          <span className="ml-3 text-xs text-gray-500">(food threshold: score &ge; 4)</span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-current"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono">{value}</span>
      {note && <span className="text-xs text-amber-600">{note}</span>}
    </div>
  );
}
