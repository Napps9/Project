import { useEffect, useState } from 'react';
import { classifyIngredient } from '../api/client';

interface Props {
  index: number;
  name: string;
  proportion: number;
  onChange: (index: number, field: 'name' | 'proportion', value: string) => void;
  onRemove: (index: number) => void;
}

export default function IngredientRow({ index, name, proportion, onChange, onRemove }: Props) {
  const [fvnStatus, setFvnStatus] = useState<{ isFvn: boolean; category: string } | null>(null);

  useEffect(() => {
    if (name.trim().length < 2) {
      setFvnStatus(null);
      return;
    }
    const timeout = setTimeout(() => {
      classifyIngredient(name.trim()).then(setFvnStatus).catch(() => setFvnStatus(null));
    }, 400);
    return () => clearTimeout(timeout);
  }, [name]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-6">{index + 1}.</span>
      <input
        type="text"
        placeholder="Ingredient name"
        value={name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        className="flex-1 border rounded px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        placeholder="%"
        value={proportion || ''}
        onChange={(e) => onChange(index, 'proportion', e.target.value)}
        className="w-20 border rounded px-2 py-1.5 text-sm text-right"
        min={0}
        max={100}
        step={0.1}
      />
      <span className="text-xs text-gray-400">%</span>
      {fvnStatus && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            fvnStatus.isFvn
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
          title={fvnStatus.category}
        >
          {fvnStatus.isFvn ? `FVN (${fvnStatus.category})` : 'non-FVN'}
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-red-400 hover:text-red-600 text-sm px-1"
        title="Remove"
      >
        x
      </button>
    </div>
  );
}
