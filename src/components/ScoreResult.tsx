import { ScoreResult as ScoreResultData } from '@/lib/types';
import ScoreBadge from './ScoreBadge';

export type { ScoreResultData };

interface Props {
  result: ScoreResultData;
}

export default function ScoreResult({ result }: Props) {
  const { aPoints, cPoints, fvnPercentage, totalScore, isHfss } = result;

  return (
    <div className="border border-zinc-300 dark:border-zinc-700 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-instrument text-zinc-400 dark:text-zinc-500">
          NPM Score Result
        </h3>
        <ScoreBadge isHfss={isHfss} score={totalScore} />
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-4xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
          {totalScore}
        </span>
        <span className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
          {aPoints.total} (A) &minus; {cPoints.total} (C)
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {result.isDrink ? 'threshold: \u22651' : 'threshold: \u22654'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="text-[10px] font-medium uppercase tracking-instrument text-accent mb-2">
            A Points &mdash; {aPoints.total}/40
          </h4>
          <div className="space-y-1.5 text-sm">
            <Row label="Energy" value={aPoints.energy} max={10} barColor="bg-accent" />
            <Row label="Sat Fat" value={aPoints.saturatedFat} max={10} barColor="bg-accent" />
            <Row label="Sugar" value={aPoints.sugar} max={10} barColor="bg-accent" />
            <Row label="Sodium" value={aPoints.sodium} max={10} barColor="bg-accent" />
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-medium uppercase tracking-instrument text-positive dark:text-positive-400 mb-2">
            C Points &mdash; {cPoints.total}/15
          </h4>
          <div className="space-y-1.5 text-sm">
            <Row label={`FVN (${fvnPercentage.toFixed(0)}%)`} value={cPoints.fruitVegNuts} max={5} barColor="bg-positive" />
            {result.fvnBreakdown && (
              <div className="ml-4 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                <BreakdownRow label="Standard FVN" percent={result.fvnBreakdown.standardFvn} />
                <BreakdownRow label="Dried + conc. (&times;2)" percent={result.fvnBreakdown.driedAndConcentrated} title="Dried fruit/veg and concentrated tomato pur&eacute;e count double" />
                <BreakdownRow label="Other" percent={result.fvnBreakdown.other} />
              </div>
            )}
            <Row label="Fibre" value={cPoints.fibre} max={5} barColor="bg-positive" />
            <Row
              label="Protein"
              value={cPoints.proteinApplied}
              max={5}
              barColor="bg-positive"
              note={cPoints.proteinApplied !== cPoints.protein ? '(blocked)' : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, percent, title }: { label: string; percent: number; title?: string }) {
  return (
    <div className="flex justify-between" title={title}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{percent.toFixed(1)}%</span>
    </div>
  );
}

function Row({ label, value, max, barColor, note }: { label: string; value: number; max: number; barColor: string; note?: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 sm:w-28 text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">{label}</span>
      <div className="flex-1 bg-zinc-200 dark:bg-zinc-800 h-1.5">
        <div className={`h-1.5 ${barColor} animate-gauge`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
      {note && <span className="text-xs text-zinc-400">{note}</span>}
    </div>
  );
}
