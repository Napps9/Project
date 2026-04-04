import { useEffect, useState } from 'react';
import { getProducts, deleteProduct } from '../api/client';
import ScoreBadge from './ScoreBadge';

interface ProductRow {
  id: number;
  name: string;
  is_drink: number;
  npm_score: number | null;
  is_hfss: number | null;
  energy_kj: number;
  saturated_fat_g: number;
  total_sugar_g: number;
  sodium_mg: number;
  fvn_percentage: number;
  created_at: string;
}

interface Props {
  refreshKey: number;
}

export default function ProductList({ refreshKey }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);

  const load = () => {
    getProducts().then((data) => setProducts(data as ProductRow[])).catch(() => {});
  };

  useEffect(load, [refreshKey]);

  const handleDelete = async (id: number) => {
    await deleteProduct(id);
    load();
  };

  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No saved products yet. Score a product and save it to see it here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">FVN %</th>
            <th className="pb-2 font-medium">Score</th>
            <th className="pb-2 font-medium">Classification</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b border-gray-100">
              <td className="py-2 font-medium text-gray-900">{p.name}</td>
              <td className="py-2 text-gray-600">{p.is_drink ? 'Drink' : 'Food'}</td>
              <td className="py-2 text-gray-600">{p.fvn_percentage.toFixed(0)}%</td>
              <td className="py-2 font-mono">{p.npm_score ?? '—'}</td>
              <td className="py-2">
                {p.npm_score !== null && p.is_hfss !== null && (
                  <ScoreBadge isHfss={p.is_hfss === 1} score={p.npm_score} />
                )}
              </td>
              <td className="py-2">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
