'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SavedProduct, ParsedIngredientState, FvnForm } from '@/lib/types';
import { loadProducts, saveProduct, saveFvnOverridesFromIngredients, deleteProduct, loadFvnOverrides } from '@/lib/storage';
import { parseCsvFile, getCsvTemplate, CsvImportRow } from '@/lib/csv-importer';
import { parsePdfFile } from '@/lib/pdf-importer';
import { parseAndClassifyIngredients, calculateFvnFromState } from '@/lib/rules/fvn-classifier';
import { calculateNpmScoreFromFvn } from '@/lib/rules/npm-engine';
import ScoreBadge from './ScoreBadge';

type FilterMode = 'all' | 'hfss' | 'healthier';
type SortField = 'name' | 'score' | 'savedAt';
type SortDir = 'asc' | 'desc';

function normaliseName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function processRow(row: CsvImportRow): SavedProduct {
  const rawIngredients = row.ingredientText
    ? parseAndClassifyIngredients(row.ingredientText)
    : [];

  const overrides = loadFvnOverrides();
  const overrideMap = new Map(overrides.map((o) => [o.name, o]));

  const ingredients: ParsedIngredientState[] = rawIngredients.map((ing) => {
    const key = normaliseName(ing.name);
    const override = overrideMap.get(key);
    if (override) {
      return {
        ...ing,
        isFvn: override.isFvn,
        category: override.isFvn ? override.category : 'none',
        recognition: override.isFvn ? ('recognized_fvn' as const) : ('recognized_non_fvn' as const),
        form: override.form ?? (override.isFvn ? ('fresh' as FvnForm) : ('none' as FvnForm)),
        userVote: null,
      };
    }
    return { ...ing, userVote: null };
  });

  const { fvnPercentage, breakdown } = calculateFvnFromState(ingredients);
  const result = calculateNpmScoreFromFvn(row.nutrition, fvnPercentage, row.isDrink, breakdown);

  return saveProduct({
    name: row.name,
    isDrink: row.isDrink,
    nutrition: row.nutrition,
    ingredients,
    result,
  });
}

export default function RecipesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortField, setSortField] = useState<SortField>('savedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<
    { total: number; hfss: number; healthier: number; errors: number; errorMessages: string[] } | null
  >(null);

  useEffect(() => {
    setProducts(loadProducts());
  }, []);

  const reloadProducts = () => {
    setProducts(loadProducts());
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    setImporting(true);
    setImportSummary(null);
    setImportProgress(null);

    try {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const parsed = isPdf
        ? await parsePdfFile(file)
        : parseCsvFile(await file.text());

      if (parsed.rows.length === 0) {
        setImportSummary({
          total: 0,
          hfss: 0,
          healthier: 0,
          errors: parsed.skippedCount + parsed.errors.length,
          errorMessages: parsed.errors,
        });
        setImporting(false);
        return;
      }

      setImportProgress({ done: 0, total: parsed.rows.length });

      let hfss = 0;
      let healthier = 0;
      const processErrors: string[] = [...parsed.errors];
      const allIngredients: ParsedIngredientState[] = [];

      for (let i = 0; i < parsed.rows.length; i++) {
        try {
          const saved = processRow(parsed.rows[i]);
          if (saved.result.isHfss) hfss++;
          else healthier++;
          allIngredients.push(...saved.ingredients);
        } catch (err) {
          processErrors.push(
            `Row "${parsed.rows[i].name}": ${err instanceof Error ? err.message : 'failed to process'}`
          );
        }
        setImportProgress({ done: i + 1, total: parsed.rows.length });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (allIngredients.length > 0) {
        saveFvnOverridesFromIngredients(allIngredients);
      }

      reloadProducts();
      setImportSummary({
        total: parsed.rows.length,
        hfss,
        healthier,
        errors: parsed.skippedCount + processErrors.length - parsed.errors.length + parsed.errors.length,
        errorMessages: processErrors,
      });
    } catch (err) {
      setImportSummary({
        total: 0,
        hfss: 0,
        healthier: 0,
        errors: 1,
        errorMessages: [err instanceof Error ? err.message : 'Failed to read file'],
      });
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = getCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipe-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this recipe?')) return;
    deleteProduct(id);
    reloadProducts();
  };

  const handleRowClick = (id: string) => {
    router.push(`/recipes/${id}`);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const visible = products
    .filter((p) => {
      if (filter === 'hfss' && !p.result.isHfss) return false;
      if (filter === 'healthier' && p.result.isHfss) return false;
      if (search.trim() && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortField === 'score') return (a.result.totalScore - b.result.totalScore) * dir;
      return (new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()) * dir;
    });

  const progressPct = importProgress
    ? Math.round((importProgress.done / importProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="flex-1 min-w-0 border border-zinc-300 dark:border-zinc-600 rounded-sm px-3 py-2 text-sm bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            aria-label="Search recipes"
          />
          <div className="flex items-center gap-0.5 border border-zinc-300 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800 flex-shrink-0">
            {(['all', 'healthier', 'hfss'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-2 sm:px-3 py-1.5 text-xs transition-colors font-medium uppercase tracking-wide ${
                  filter === mode
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'hfss' ? 'HFSS' : 'Healthy'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:justify-end">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-center"
          >
            Download Template
          </button>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-sm hover:bg-accent-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {importing && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {importing ? 'Importing...' : 'Import CSV / PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {importing && importProgress && (
        <div className="border border-zinc-300 dark:border-zinc-700 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Processing&hellip; {importProgress.done}/{importProgress.total}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">{progressPct}%</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5">
            <div
              className="h-1.5 bg-accent transition-all animate-gauge"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {importSummary && !importing && (
        <div
          className={`border p-3 sm:p-4 text-sm ${
            importSummary.total > 0
              ? 'bg-positive/5 border-positive/20 text-positive dark:text-positive-400'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div>
              <strong>Import complete.</strong>{' '}
              {importSummary.total > 0 ? (
                <>
                  {importSummary.total} recipe{importSummary.total !== 1 ? 's' : ''} &mdash;{' '}
                  <span className="text-accent">{importSummary.hfss} HFSS</span>,{' '}
                  <span className="text-positive">{importSummary.healthier} healthier</span>
                  {importSummary.errors > 0 && (
                    <>
                      {' '}
                      &middot; <span className="text-amber-700 dark:text-amber-400">{importSummary.errors} error(s)</span>
                    </>
                  )}
                </>
              ) : (
                <>No rows imported. {importSummary.errors} error(s).</>
              )}
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Dismiss import summary"
            >
              Dismiss
            </button>
          </div>
          {importSummary.errorMessages.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">
                Show {importSummary.errorMessages.length} error detail(s)
              </summary>
              <ul className="mt-1 text-xs list-disc list-inside space-y-0.5">
                {importSummary.errorMessages.slice(0, 20).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
                {importSummary.errorMessages.length > 20 && (
                  <li>...and {importSummary.errorMessages.length - 20} more</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="border border-zinc-300 dark:border-zinc-700 p-8 sm:p-12 text-center">
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">No recipes yet</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Import a CSV file to add recipes in bulk, or{' '}
            <Link href="/" className="text-zinc-900 dark:text-zinc-100 hover:text-accent dark:hover:text-accent transition-colors">
              score a single recipe
            </Link>{' '}
            from the home page.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-zinc-300 dark:border-zinc-700 p-8 text-center text-zinc-500 dark:text-zinc-400 text-sm">
          No recipes match your filters.
        </div>
      ) : (
        <>
          <div className="space-y-2 sm:hidden">
            {visible.map((p) => (
              <div
                key={p.id}
                onClick={() => handleRowClick(p.id)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors active:bg-zinc-50 dark:active:bg-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm truncate">{p.name}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(p.id, e)}
                    className="text-zinc-300 hover:text-accent dark:text-zinc-600 dark:hover:text-accent p-2 -mr-1 transition-colors"
                    aria-label={`Delete ${p.name}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                  <span>Score: {p.result.totalScore}</span>
                  <span>A: <span className="text-accent">{p.result.aPoints.total}</span></span>
                  <span>C: <span className="text-positive dark:text-positive-400">{p.result.cPoints.total}</span></span>
                  <span>FVN: {p.result.fvnPercentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-2 font-mono tabular-nums">
              {visible.length} of {products.length} recipe{products.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                  <tr>
                    <th
                      onClick={() => toggleSort('name')}
                      className="text-left px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                      Name {sortField === 'name' && (sortDir === 'asc' ? '\u25B2' : '\u25BC')}
                    </th>
                    <th className="text-left px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400">HFSS</th>
                    <th
                      onClick={() => toggleSort('score')}
                      className="text-right px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                    >
                      Score {sortField === 'score' && (sortDir === 'asc' ? '\u25B2' : '\u25BC')}
                    </th>
                    <th className="text-right px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">A pts</th>
                    <th className="text-right px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden lg:table-cell">C pts</th>
                    <th className="text-right px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 hidden md:table-cell">FVN%</th>
                    <th
                      onClick={() => toggleSort('savedAt')}
                      className="text-left px-3 md:px-4 py-3 text-[10px] font-medium uppercase tracking-instrument text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors hidden md:table-cell"
                    >
                      Saved {sortField === 'savedAt' && (sortDir === 'asc' ? '\u25B2' : '\u25BC')}
                    </th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p.id)}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 md:px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-3 md:px-4 py-3">
                        <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
                      </td>
                      <td className="px-3 md:px-4 py-3 text-right font-mono tabular-nums">{p.result.totalScore}</td>
                      <td className="px-3 md:px-4 py-3 text-right font-mono tabular-nums text-accent hidden lg:table-cell">
                        {p.result.aPoints.total}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-right font-mono tabular-nums text-positive dark:text-positive-400 hidden lg:table-cell">
                        {p.result.cPoints.total}
                      </td>
                      <td className="px-3 md:px-4 py-3 text-right font-mono tabular-nums text-zinc-600 dark:text-zinc-400 hidden md:table-cell">
                        {p.result.fvnPercentage.toFixed(0)}%
                      </td>
                      <td className="px-3 md:px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums hidden md:table-cell">
                        {new Date(p.savedAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 md:px-4 py-3">
                        <button
                          onClick={(e) => handleDelete(p.id, e)}
                          className="text-xs text-zinc-400 hover:text-accent dark:text-zinc-500 dark:hover:text-accent transition-colors p-1"
                          aria-label={`Delete ${p.name}`}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 md:px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t border-zinc-300 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
              {visible.length} of {products.length} recipe{products.length !== 1 ? 's' : ''}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
