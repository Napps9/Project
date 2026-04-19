interface ScoreBadgeProps {
  isHfss: boolean;
  score: number;
}

export default function ScoreBadge({ isHfss, score }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-xs font-medium tracking-wide uppercase ${
        isHfss
          ? 'bg-accent-50 text-accent border border-accent/30 dark:bg-accent/10 dark:text-accent-50 dark:border-accent/20'
          : 'bg-positive/10 text-positive border border-positive/30 dark:bg-positive/10 dark:text-positive-400 dark:border-positive/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 ${isHfss ? 'bg-accent' : 'bg-positive'}`} />
      {isHfss ? 'HFSS' : 'Healthier'}
      <span className="font-mono tabular-nums opacity-70">({score})</span>
    </span>
  );
}
