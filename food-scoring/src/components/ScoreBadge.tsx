interface ScoreBadgeProps {
  isHfss: boolean;
  score: number;
}

export default function ScoreBadge({ isHfss, score }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
        isHfss
          ? 'bg-red-100 text-red-800 border border-red-200'
          : 'bg-green-100 text-green-800 border border-green-200'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isHfss ? 'bg-red-500' : 'bg-green-500'}`} />
      {isHfss ? 'HFSS — Less Healthy' : 'Healthier'}
      <span className="ml-1 text-xs opacity-70">({score})</span>
    </span>
  );
}
