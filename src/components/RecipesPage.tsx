'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SavedProduct, ParsedIngredientState, FvnForm } from '@/lib/types';
import { loadProducts, saveProduct, saveFvnOverridesFromIngredients, deleteProduct, loadFvnOverrides } from '@/lib/storage';
import { parseCsvFile, getCsvTemplate, CsvImportRow } from '@/lib/csv-importer';
import { parsePdfFile } from '@/lib/pdf-importer';
import { parseAndClassifyIngredients } from '@/lib/rules/fvn-classifier';
import { calculateNpmScoreFromFvn } from '@/lib/rules/npm-engine';
import ScoreBadge from './ScoreBadge';

type FilterMode = 'all' | 'hfss' | 'healthier';
type SortField = 'name' | 'score' | 'savedAt';
type SortDir = 'asc' | 'desc';

function normaliseName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

/** Process a single CSV row into a saved product. */
function processRow(row: CsvImportRow): SavedProduct {
  // 1. Parse + classify ingredients from text
  const rawIngredients = row.ingredientText
    ? parseAndClassifyIngredients(row.ingredientText)
    : [];

  // 2. Apply learned FVN overrides
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

  // 3. Calculate FVN% with form multipliers
  const fvnPercentage = Math.min(
    ingredients.reduce((sum, ing) => {
      const effective =
        (ing.isFvn && ing.form !== 'excluded' && ing.userVote !== 'down') ||
        ing.userVote === 'up';
      if (!effective) return sum;
      return sum + ing.proportion * (ing.form === 'dried' ? 2 : 1);
    }, 0),
    100
  );

  // 4. Score
  const result = calculateNpmScoreFromFvn(row.nutrition, fvnPercentage, row.isDrink);

  // 5. Save
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

    // Reset input so the same file can be re-uploaded
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

      // Process rows sequentially so each can read the latest overrides
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
        // Yield to the browser so the progress bar updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Save learned FVN overrides from all imported ingredients at once
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

  // Filter + search + sort
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
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="flex-1 max-w-sm border rounded px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-1 border rounded p-0.5 bg-white">
            {(['all', 'healthier', 'hfss'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  filter === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode === 'all' ? 'All' : mode === 'hfss' ? 'HFSS' : 'Healthier'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50"
          >
            Download Template
          </button>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
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

      {/* Progress bar */}
      {importing && importProgress && (
        <div className="bg-white border border-gray-200 rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Processing recipes... {importProgress.done} of {importProgress.total}
            </span>
            <span className="text-gray-500">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Import summary */}
      {importSummary && !importing && (
        <div
          className={`border rounded p-4 text-sm ${
            importSummary.total > 0
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <strong>Import complete.</strong>{' '}
              {importSummary.total > 0 ? (
                <>
                  Imported {importSummary.total} recipe
                  {importSummary.total !== 1 ? 's' : ''} —{' '}
                  <span className="text-red-700">{importSummary.hfss} HFSS</span>,{' '}
                  <span className="text-green-700">{importSummary.healthier} healthier</span>
                  {importSummary.errors > 0 && (
                    <>
                      {' '}
                      · <span className="text-amber-700">{importSummary.errors} error(s)</span>
                    </>
                  )}
                </>
              ) : (
                <>No rows imported. {importSummary.errors} error(s).</>
              )}
            </div>
            <button
              onClick={() => setImportSummary(null)}
              className="text-xs opacity-60 hover:opacity-100"
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

      {/* Table / empty state */}
      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-lg font-medium text-gray-700">No recipes yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Import a CSV file to add recipes in bulk, or{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              score a single recipe
            </Link>{' '}
            from the home page.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
          No recipes match your filters.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                >
                  Name {sortField === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">HFSS</th>
                <th
                  onClick={() => toggleSort('score')}
                  className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                >
                  Score {sortField === 'score' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">A pts</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">C pts</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">FVN%</th>
                <th
                  onClick={() => toggleSort('savedAt')}
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                >
                  Saved {sortField === 'savedAt' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleRowClick(p.id)}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge isHfss={p.result.isHfss} score={p.result.totalScore} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{p.result.totalScore}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">
                    {p.result.aPoints.total}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-700">
                    {p.result.cPoints.total}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {p.result.fvnPercentage.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(p.savedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      className="text-xs text-red-400 hover:text-red-600"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
            Showing {visible.length} of {products.length} recipe{products.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
