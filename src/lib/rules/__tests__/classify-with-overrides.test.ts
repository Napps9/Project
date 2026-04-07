import { describe, it, expect } from 'vitest';
import { classifyWithOverrides, classifyIngredient } from '../fvn-classifier';
import { FvnOverride } from '../../types';

describe('classifyWithOverrides', () => {
  const overrides: FvnOverride[] = [
    { name: 'xanthan gum', isFvn: false, category: 'none', updatedAt: '2024-01-01' },
    { name: 'goji berry', isFvn: true, category: 'fruit', updatedAt: '2024-01-01' },
  ];

  it('returns override classification for exact match', () => {
    const result = classifyWithOverrides('Xanthan Gum', overrides);
    expect(result.isFvn).toBe(false);
    expect(result.recognition).toBe('recognized_non_fvn');
  });

  it('returns override FVN classification for exact match', () => {
    const result = classifyWithOverrides('Goji Berry', overrides);
    expect(result.isFvn).toBe(true);
    expect(result.category).toBe('fruit');
    expect(result.recognition).toBe('recognized_fvn');
  });

  it('falls back to built-in classifier when no override matches', () => {
    const result = classifyWithOverrides('Apple', overrides);
    const builtin = classifyIngredient('Apple');
    expect(result.isFvn).toBe(builtin.isFvn);
    expect(result.category).toBe(builtin.category);
  });

  it('works with empty overrides list', () => {
    const result = classifyWithOverrides('Apple', []);
    expect(result.isFvn).toBe(true);
    expect(result.recognition).toBe('recognized_fvn');
  });

  it('override can flip a built-in FVN ingredient to non-FVN', () => {
    const flipOverrides: FvnOverride[] = [
      { name: 'apple', isFvn: false, category: 'none', updatedAt: '2024-01-01' },
    ];
    const result = classifyWithOverrides('Apple', flipOverrides);
    expect(result.isFvn).toBe(false);
    expect(result.recognition).toBe('recognized_non_fvn');
  });
});
